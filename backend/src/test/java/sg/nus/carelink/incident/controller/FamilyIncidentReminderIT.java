package sg.nus.carelink.incident.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import sg.nus.carelink.incident.application.IncidentFamilyEvents;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import sg.nus.carelink.testsupport.SharedMySql;

/** HTTP acceptance from published/assigned care to each family's independent receipts.
 * The real timer and family inbox/receipt APIs are the observable boundaries; SQL supplies synthetic people and deliberate database fault injection.
 * @author Wang Zhili
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "carelink.report.schedule-cron=-", "carelink.roster.schedule-cron=-", "carelink.caregiver.expiry-scan-cron=-",
        "carelink.rerostering.scan-initial-delay=PT1H", "carelink.escalation.scan-initial-delay=PT1H",
        "carelink.family-alert.reminder-scan-interval=PT0.1S", "carelink.family-alert.reminder-scan-initial-delay=PT0.1S",
        "carelink.roster.uncovered-scan-initial-delay=PT1H", "carelink.roster.leave-reminder-initial-delay=PT1H"
})
@Import(FamilyIncidentReminderIT.TimeConfiguration.class)
class FamilyIncidentReminderIT {
    private static final Instant START = Instant.parse("2026-10-08T02:00:00Z");
    private static final ZoneId SINGAPORE = ZoneId.of("Asia/Singapore");
    private static final String DESCRIPTION = "A fictional fall during care; assistance was provided.";
    @LocalServerPort private int port;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ScenarioClock clock;
    @Autowired private IncidentFamilyEvents events;
    @Autowired private PlatformTransactionManager transactions;
    private final JsonMapper json = JsonMapper.builder().build();
    private String managerName, caregiverName, elderName, familyAName, familyBName;
    private long elder, caregiver, familyA, familyB, familyAUser, familyBUser;

    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        SharedMySql.register(registry, FamilyIncidentReminderIT.class, "+05:00", "connectionTimeZone=Asia/Singapore");
    }
    @TestConfiguration(proxyBeanMethods = false) static class TimeConfiguration {
        @Bean @Primary ScenarioClock workflowClock() { return new ScenarioClock(); }
    }
    static class ScenarioClock extends Clock {
        private volatile Instant current = START;
        void at(Instant value) { current = value; }
        @Override public ZoneId getZone() { return SINGAPORE; }
        @Override public Clock withZone(ZoneId zone) { return Clock.fixed(current, zone); }
        @Override public Instant instant() { return current; }
    }

    @BeforeEach void peopleOnly() {
        clock.at(START);
        // The class owns a fresh SharedMySql database; prior managers must not take this scenario's incident.
        jdbc.update("DELETE FROM user_role WHERE role='MANAGER'");
        jdbc.update("UPDATE caregiver SET status='INACTIVE'");
        String run = UUID.randomUUID().toString().substring(0, 8);
        managerName = "fm05-manager-" + run; caregiverName = "fm05-caregiver-" + run;
        elderName = "fm05-elder-" + run; familyAName = "fm05-family-a-" + run; familyBName = "fm05-family-b-" + run;
        account(managerName, "MANAGER");
        caregiver = insert("INSERT INTO caregiver(user_id,full_name,status,sector,dialects) VALUES (?,'Fictional caregiver','AVAILABLE','North','English')", account(caregiverName, "CAREGIVER"));
        elder = insert("INSERT INTO elder(user_id,full_name,sector,preferred_dialects) VALUES (?,'Fictional elder','North','English')", account(elderName, "ELDER"));
        familyAUser = account(familyAName, "FAMILY"); familyBUser = account(familyBName, "FAMILY");
        familyA = relative(familyAUser, "FULL"); familyB = relative(familyBUser, "READ_ONLY");
    }

    @Test void timerRemindsOnceAtTheOriginalDeadlineEvenAfterReadAndView() throws Exception {
        var report = report();
        try (var a = browser(familyAName); var b = browser(familyBName); var manager = browser(managerName)) {
            var before = detail(a, report.id());
            var managerBefore = manager.read("/api/incidents/" + report.id());
            var first = a.read("/api/notifications/me").path("items").get(0);
            var read = body(a.command("POST", "/api/notifications/" + first.path("id").asLong() + "/read", null), 200);
            var view = body(a.command("POST", "/api/incidents/" + report.id() + "/view", null), 200);
            clock.at(START.plusSeconds(7499)); // 12:04:59: one second before this family's 12:05 deadline.
            Thread.sleep(500);
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(1);
            clock.at(START.plusSeconds(7500));
            awaitCount(a, 2); awaitCount(b, 2);
            var inbox = a.read("/api/notifications/me");
            var reminder = inbox.path("items").get(0);
            assertThat(reminder.path("eventType").asString()).isEqualTo("INCIDENT_ACKNOWLEDGEMENT_DUE");
            assertThat(reminder.path("title").asString()).isEqualTo("Care alert reminder: please acknowledge");
            assertThat(reminder.path("body").asString()).doesNotContain(DESCRIPTION);
            assertThat(reminder.path("resourceId").asLong()).isEqualTo(report.id());
            assertThat(reminder.path("status").asString()).isEqualTo("SENT");
            assertThat(inbox.path("items").get(1)).isEqualTo(read);
            assertThat(detail(a, report.id()).path("acknowledgeBy")).isEqualTo(before.path("acknowledgeBy"));
            assertThat(detail(a, report.id()).path("acknowledgement")).isEqualTo(view);
            assertEmptyReceipt(detail(b, report.id()));
            assertThat(manager.read("/api/incidents/" + report.id())).isEqualTo(managerBefore);
            clock.at(START.plusSeconds(10000));
            Thread.sleep(500);
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(2);
            assertThat(b.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(2);
        }
    }

    @Test void awarenessStopsOnlyThatFamilysReminderAndFirstReceiptRemainsUnchanged() throws Exception {
        var report = report();
        try (var a = browser(familyAName); var b = browser(familyBName)) {
            var aware = body(a.command("POST", "/api/incidents/" + report.id() + "/acknowledge", Map.of("responseNote", "Already aware")), 200);
            clock.at(START.plusSeconds(7500));
            awaitCount(b, 2);
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(1);
            assertThat(detail(a, report.id()).path("acknowledgement")).isEqualTo(aware);
            var awareB = body(b.command("POST", "/api/incidents/" + report.id() + "/acknowledge", Map.of("responseNote", "Saw reminder")), 200);
            clock.at(START.plusSeconds(10000));
            publish(report.id(), familyA); publish(report.id(), familyB);
            assertThat(detail(b, report.id()).path("acknowledgement")).isEqualTo(awareB);
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(1);
            assertThat(b.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(2);
        }
    }

    @ParameterizedTest @ValueSource(strings = {"REVOKED", "EXPIRED", "ROLE_REMOVED", "DISABLED"})
    void currentRecipientIneligibilityPreventsReminder(String exclusion) throws Exception {
        var report = report();
        try (var a = browser(familyAName); var b = browser(familyBName)) {
            switch (exclusion) {
                case "REVOKED" -> jdbc.update("UPDATE elder_family_binding SET status='REVOKED' WHERE elder_id=? AND family_member_id=?", elder, familyA);
                case "EXPIRED" -> jdbc.update("UPDATE elder_family_binding SET expires_at='2026-10-08 11:00:00' WHERE elder_id=? AND family_member_id=?", elder, familyA);
                case "ROLE_REMOVED" -> jdbc.update("DELETE FROM user_role WHERE user_id=? AND role='FAMILY'", familyAUser);
                case "DISABLED" -> jdbc.update("UPDATE app_user SET enabled=0 WHERE id=?", familyAUser);
                default -> throw new AssertionError(exclusion);
            }
            clock.at(START.plusSeconds(7500));
            awaitCount(b, 2); // Family A is checked before B, whose timer delivery proves the sweep ran.
            // Move before the deadline before restoring access, so the assertion observes the excluded period.
            clock.at(START.plusSeconds(7499));
            jdbc.update("UPDATE elder_family_binding SET status='ACTIVE',expires_at=NULL WHERE elder_id=? AND family_member_id=?", elder, familyA);
            jdbc.update("UPDATE app_user SET enabled=1 WHERE id=?", familyAUser);
            if (exclusion.equals("ROLE_REMOVED")) jdbc.update("INSERT INTO user_role(user_id,role) VALUES (?,'FAMILY')", familyAUser);
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(1);
            assertEmptyReceipt(detail(a, report.id()));
            body(a.command("POST", "/api/incidents/" + report.id() + "/acknowledge", null), 200);
        }
    }

    @Test void resolvedIncidentDoesNotGenerateADeadlineReminder() throws Exception {
        var report = report();
        try (var manager = browser(managerName); var a = browser(familyAName); var b = browser(familyBName)) {
            body(manager.command("POST", "/api/incidents/" + report.id() + "/claim", null), 200);
            assertThat(body(manager.command("POST", "/api/incidents/" + report.id() + "/resolve", Map.of("resolutionNote", "Fictional case resolved")), 200).path("status").asString()).isEqualTo("RESOLVED");
            clock.at(START.plusSeconds(7500));
            publish(report.id(), familyA); publish(report.id(), familyB);
            Thread.sleep(300);
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(1);
            assertThat(b.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(1);
            assertEmptyReceipt(detail(a, report.id()));
        }
    }

    @Test void missingInitialNotificationNeverStartsReminderWaiting() throws Exception {
        jdbc.update("DELETE FROM user_role WHERE user_id IN (?,?) AND role='FAMILY'", familyAUser, familyBUser);
        var report = report();
        jdbc.update("INSERT INTO user_role(user_id,role) VALUES (?,'FAMILY'),(?,'FAMILY')", familyAUser, familyBUser);
        try (var a = browser(familyAName); var b = browser(familyBName)) {
            assertThat(detail(a, report.id()).path("acknowledgeBy").isNull()).isTrue();
            clock.at(START.plusSeconds(7500));
            publish(report.id(), familyA);
            Thread.sleep(300);
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isZero();
            assertThat(b.read("/api/notifications/me").path("totalElements").asInt()).isZero();
            assertEmptyReceipt(detail(a, report.id()));
        }
    }

    @Test void concurrentReplayAndTimerCreateOnlyOneReminderForEachTarget() throws Exception {
        var report = report();
        try (var a = browser(familyAName); var b = browser(familyBName)) {
            publish(report.id(), familyA); // An early replay must not remind or reset the original window.
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(1);
            clock.at(START.plusSeconds(7500));
            var first = CompletableFuture.runAsync(() -> publish(report.id(), familyA));
            var second = CompletableFuture.runAsync(() -> publish(report.id(), familyA));
            CompletableFuture.allOf(first, second).get();
            awaitCount(a, 2); awaitCount(b, 2);
            publish(report.id(), familyA); publish(report.id(), familyB);
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(2);
            assertThat(b.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(2);
            assertThat(detail(a, report.id()).path("acknowledgeBy").asString()).isEqualTo("2026-10-08T12:05:00+08:00");
            assertEmptyReceipt(detail(a, report.id()));
        }
    }

    @Test void oneFailedRecipientRetriesWithoutDuplicatingAnotherFamilysReminder() throws Exception {
        var report = report();
        // A database outage at the durable notification write, without replacing application collaborators.
        jdbc.execute("CREATE TRIGGER fail_reminder BEFORE INSERT ON notification FOR EACH ROW BEGIN IF NEW.event_type='INCIDENT_ACKNOWLEDGEMENT_DUE' AND NEW.recipient_user_id=" + familyAUser + " THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic reminder write outage'; END IF; END");
        try (var a = browser(familyAName); var b = browser(familyBName)) {
            clock.at(START.plusSeconds(7500));
            awaitCount(b, 2);
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(1);
            assertEmptyReceipt(detail(a, report.id()));
            jdbc.execute("DROP TRIGGER fail_reminder");
            awaitCount(a, 2);
            publish(report.id(), familyA); publish(report.id(), familyB);
            assertThat(b.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(2);
            assertThat(detail(a, report.id()).path("acknowledgeBy").asString()).isEqualTo("2026-10-08T12:05:00+08:00");
        } finally {
            jdbc.execute("DROP TRIGGER IF EXISTS fail_reminder");
        }
    }

    private void publish(long incidentId, long familyId) {
        new TransactionTemplate(transactions).executeWithoutResult(status -> events.acknowledgementDue(incidentId, elder,
                familyId, java.time.OffsetDateTime.parse("2026-10-08T12:05:00+08:00")));
    }

    private void awaitCount(Browser browser, int count) throws Exception {
        long until = System.nanoTime() + Duration.ofSeconds(5).toNanos();
        while (browser.read("/api/notifications/me").path("totalElements").asInt() != count && System.nanoTime() < until) {
            Thread.sleep(100);
        }
        assertThat(browser.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(count);
    }

    private long plannedVisit() throws Exception {
        var start = LocalDateTime.ofInstant(START.plusSeconds(300), SINGAPORE);
        try (var manager = browser(managerName)) {
            body(manager.command("PUT", "/api/elders/" + elder + "/primary-caregiver", Map.of("caregiverId", caregiver)), 200);
            long plan = body(manager.command("POST", "/api/care-plans", Map.of("elderId", elder)), 201).path("id").asLong();
            body(manager.command("POST", "/api/care-plans/" + plan + "/publish", Map.of("startDate", start.toLocalDate().toString(), "nodes", List.of(Map.of(
                    "groupName", "Personal care", "name", "FM05 workflow care", "evidenceType", "CHECKLIST", "visits", List.of(Map.of("day", "THURSDAY", "startTime", "10:05", "minutes", 60)))))), 200);
            for (var row : manager.read("/api/visits/roster?date=2026-10-08")) {
                if (row.path("carePlanId").asLong() == plan) {
                    assertThat(row.path("caregiverId").asLong()).isEqualTo(caregiver);
                    clock.at(START.plusSeconds(300));
                    return row.path("id").asLong();
                }
            }
            throw new AssertionError("Published/assigned plan must produce its visit through the roster API");
        }
    }
    private Report report() throws Exception {
        long visit = plannedVisit();
        var input = reportInput(visit);
        try (var caregiver = browser(caregiverName)) {
            long id = body(caregiver.command("POST", "/api/incidents", input), 201).path("report").path("id").asLong();
            return new Report(id, visit, input);
        }
    }
    private Map<String, Object> reportInput(long visit) {
        return Map.of("visitId", visit, "expectedVersion", 0, "clientRequestId", UUID.randomUUID().toString(),
                "category", "FALL", "severity", "HIGH", "description", DESCRIPTION);
    }
    private record Report(long id, long visit, Map<String, Object> input) { }
    private JsonNode detail(Browser browser, long id) throws Exception { return browser.read("/api/family/incidents/" + id); }
    private void assertEmptyReceipt(JsonNode detail) {
        var receipt = detail.path("acknowledgement");
        assertThat(receipt.path("viewedAt").isNull()).isTrue(); assertThat(receipt.path("acknowledgedAt").isNull()).isTrue();
    }
    private long relative(long user, String scope) {
        long id = insert("INSERT INTO family_member(user_id,full_name) VALUES (?, 'Fictional family')", user);
        jdbc.update("INSERT INTO elder_family_binding(elder_id,family_member_id,relationship,access_scope,status) VALUES (?,?,'DAUGHTER',?,'ACTIVE')", elder, id, scope);
        return id;
    }
    private long account(String name, String role) {
        long id = insert("INSERT INTO app_user(username,password_hash,display_name) VALUES (?, '{noop}test-password', ?)", name, name);
        jdbc.update("INSERT INTO user_role(user_id,role) VALUES (?,?)", id, role); return id;
    }
    private long insert(String sql, Object... values) {
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(sql, java.sql.Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < values.length; i++) statement.setObject(i + 1, values[i]);
            return statement;
        }, key); return key.getKey().longValue();
    }
    private JsonNode body(HttpResponse<String> response, int expected) {
        assertThat(response.statusCode()).as("HTTP body: %s", response.body()).isEqualTo(expected); return json.readTree(response.body());
    }
    private Browser browser(String name) throws Exception {
        var browser = new Browser(); body(browser.command("POST", "/api/auth/login", Map.of("username", name, "password", "test-password")), 200); return browser;
    }
    private class Browser implements AutoCloseable {
        private final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        private final HttpClient client = HttpClient.newBuilder().cookieHandler(cookies).connectTimeout(Duration.ofSeconds(5)).build();
        HttpResponse<String> get(String path) throws Exception { return client.send(request(path).GET().build(), HttpResponse.BodyHandlers.ofString()); }
        JsonNode read(String path) throws Exception { return body(get(path), 200); }
        HttpResponse<String> command(String method, String path, Map<String, ?> payload) throws Exception {
            assertThat(get("/api/auth/csrf").statusCode()).isEqualTo(200);
            String token = cookies.getCookieStore().getCookies().stream().filter(cookie -> cookie.getName().equals("XSRF-TOKEN")).findFirst().orElseThrow().getValue();
            var request = request(path).header("X-XSRF-TOKEN", token);
            var data = HttpRequest.BodyPublishers.noBody();
            if (payload != null) { request.header("Content-Type", "application/json"); data = HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)); }
            return client.send(request.method(method, data).build(), HttpResponse.BodyHandlers.ofString());
        }
        private HttpRequest.Builder request(String path) { return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(15)); }
        @Override public void close() { client.close(); }
    }
}
