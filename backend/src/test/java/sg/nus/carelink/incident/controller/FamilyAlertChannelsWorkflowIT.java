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
import java.util.regex.Pattern;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;
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

/** Real CG04/EL03 HTTP to SMTP, inbox and independent family receipts.
 * SQL supplies only synthetic people/bindings and a source-transaction fault, not incidents or events.
 * @author Wang Zhili
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "carelink.report.schedule-cron=-", "carelink.roster.schedule-cron=-", "carelink.caregiver.expiry-scan-cron=-",
        "carelink.rerostering.scan-initial-delay=PT1H", "carelink.escalation.scan-initial-delay=PT1H",
        "carelink.roster.uncovered-scan-initial-delay=PT1H", "carelink.roster.leave-reminder-initial-delay=PT1H"
})
@Import(FamilyAlertChannelsWorkflowIT.TimeConfiguration.class)
class FamilyAlertChannelsWorkflowIT {
    private static final String CONTACT = "/api/family/notification-email";
    private static final GenericContainer<?> MAIL = new GenericContainer<>(DockerImageName.parse("axllent/mailpit:v1.31.4"))
            .withExposedPorts(1025, 8025).waitingFor(Wait.forHttp("/api/v1/info").forPort(8025));
    private static final Instant START = Instant.parse("2026-10-08T02:00:00Z");
    private static final ZoneId SINGAPORE = ZoneId.of("Asia/Singapore");
    private static final String DESCRIPTION = "A fictional fall during care; assistance was provided.";
    @LocalServerPort private int port;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ScenarioClock clock;
    private final JsonMapper json = JsonMapper.builder().build();
    private String managerName, caregiverName, elderName, familyAName, familyBName;
    private long elder, caregiver, familyA, familyB, familyAUser, familyBUser;

    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        SharedMySql.register(registry, FamilyAlertChannelsWorkflowIT.class, "+05:00", "connectionTimeZone=Asia/Singapore");
        MAIL.start();
        registry.add("spring.mail.host", MAIL::getHost); registry.add("spring.mail.port", () -> MAIL.getMappedPort(1025));
        registry.add("carelink.family-email.enabled", () -> true);
        registry.add("carelink.family-email.from", () -> "carelink@example.test");
        registry.add("carelink.family-email.app-base-url", () -> "http://127.0.0.1:5173");
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

    @ParameterizedTest @ValueSource(strings = {"CG04", "EL03"})
    void realSourceReachesBothChannelsAndReceiptsRemainIndependent(String source) throws Exception {
        String emailA = address(), emailB = address();
        try (var a = browser(familyAName); var b = browser(familyBName); var manager = browser(managerName)) {
            verifyEmail(a, emailA); verifyEmail(b, emailB);
            var report = sourceReport(source);
            assertSafeMail(awaitMail(emailA, "CareLink urgent care alert"), report.id());
            assertSafeMail(awaitMail(emailB, "CareLink urgent care alert"), report.id());
            var noticeA = notice(a, report.id()); var noticeB = notice(b, report.id());
            assertThat(noticeA.path("id")).isNotEqualTo(noticeB.path("id"));
            var initial = detail(a, report.id());
            assertThat(initial.path("source").asString()).isEqualTo(source.equals("CG04") ? "CAREGIVER" : "ELDER_SOS");
            assertThat(initial.path("description").asString()).isEqualTo(DESCRIPTION);
            assertEmptyReceipt(initial); assertEmptyReceipt(detail(b, report.id()));
            var deadline = initial.path("acknowledgeBy");
            var staffBefore = manager.read("/api/incidents/" + report.id());
            clock.at(START.plusSeconds(360));
            var read = body(a.command("POST", "/api/notifications/" + noticeA.path("id").asLong() + "/read", null), 200);
            assertThat(read.path("status").asString()).isEqualTo("READ");
            assertEmptyReceipt(detail(a, report.id()));
            clock.at(START.plusSeconds(420));
            var viewed = body(a.command("POST", "/api/incidents/" + report.id() + "/view", null), 200);
            assertThat(viewed.path("viewedAt").asString()).isEqualTo("2026-10-08T10:07:00+08:00");
            assertThat(viewed.path("acknowledgedAt").isNull()).isTrue();
            clock.at(START.plusSeconds(480));
            var aware = body(a.command("POST", "/api/incidents/" + report.id() + "/acknowledge", Map.of("responseNote", "Family A knows")), 200);
            assertThat(aware.path("acknowledgedAt").asString()).isEqualTo("2026-10-08T10:08:00+08:00");
            assertThat(aware.path("viewedAt")).isEqualTo(viewed.path("viewedAt"));
            clock.at(START.plusSeconds(540));
            assertThat(body(a.command("POST", "/api/incidents/" + report.id() + "/acknowledge", Map.of("responseNote", "Must not overwrite")), 200)).isEqualTo(aware);
            assertThat(detail(a, report.id()).path("acknowledgeBy")).isEqualTo(deadline);
            assertThat(manager.read("/api/incidents/" + report.id())).isEqualTo(staffBefore);
            assertEmptyReceipt(detail(b, report.id()));
            assertThat(notice(b, report.id()).path("status").asString()).isEqualTo("SENT");
            assertThat(a.read("/api/notifications/me/unread-count").path("unread").asInt()).isZero();
            assertThat(b.read("/api/notifications/me/unread-count").path("unread").asInt()).isEqualTo(1);
            if (source.equals("CG04")) {
                try (var caregiverBrowser = browser(caregiverName)) {
                    var replay = body(caregiverBrowser.command("POST", "/api/incidents", report.input()), 200);
                    assertThat(replay.path("replayed").asBoolean()).isTrue();
                    assertThat(replay.path("report").path("id").asLong()).isEqualTo(report.id());
                }
                assertThat(notice(a, report.id())).isEqualTo(read);
                assertThat(detail(a, report.id()).path("acknowledgement")).isEqualTo(aware);
            }
            assertThat(mailCount(emailA, "CareLink urgent care alert")).isEqualTo(1);
            assertThat(mailCount(emailB, "CareLink urgent care alert")).isEqualTo(1);
        }
    }

    @ParameterizedTest @ValueSource(strings = {"CG04", "EL03"})
    void deliveredEmailLinkDoesNotRetainAccessAfterBindingRevocation(String source) throws Exception {
        String emailA = address(), emailB = address();
        try (var a = browser(familyAName); var b = browser(familyBName); var elderBrowser = browser(elderName)) {
            verifyEmail(a, emailA); verifyEmail(b, emailB);
            var report = sourceReport(source);
            assertSafeMail(awaitMail(emailA, "CareLink urgent care alert"), report.id());
            awaitMail(emailB, "CareLink urgent care alert");
            var original = notice(a, report.id());
            long binding = elderBrowser.read("/api/elders/me/family-bindings").valueStream()
                    .filter(row -> row.path("familyMemberId").asLong() == familyA).findFirst().orElseThrow().path("id").asLong();
            body(elderBrowser.command("DELETE", "/api/elders/me/family-bindings/" + binding, null), 200);
            assertThat(a.get("/api/family/incidents/" + report.id()).statusCode()).isEqualTo(403);
            assertThat(a.command("POST", "/api/incidents/" + report.id() + "/view", null).statusCode()).isEqualTo(403);
            assertThat(a.command("POST", "/api/incidents/" + report.id() + "/acknowledge", null).statusCode()).isEqualTo(403);
            assertThat(a.command("POST", "/api/notifications/" + original.path("id").asLong() + "/read", null).statusCode()).isEqualTo(404);
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isZero();
            assertEmptyReceipt(detail(b, report.id()));
            assertThat(notice(b, report.id()).path("status").asString()).isEqualTo("SENT");
            assertThat(mailCount(emailA, "CareLink urgent care alert")).isEqualTo(1);
        }
    }

    @Test void rolledBackCg04ReportSendsNothingAndExplicitRetryCreatesOneAlert() throws Exception {
        String email = address();
        try (var family = browser(familyAName); var caregiverBrowser = browser(caregiverName)) {
            verifyEmail(family, email);
            long visit = plannedVisit(); var input = reportInput(visit);
            jdbc.execute("CREATE TRIGGER fm05_channels_source_fault BEFORE INSERT ON caregiver_command_receipt FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic source failure'");
            try {
                assertThat(caregiverBrowser.command("POST", "/api/incidents", input).statusCode()).isEqualTo(503);
                assertThat(caregiverBrowser.read("/api/caregivers/me/incidents?visitId=" + visit).path("totalElements").asInt()).isZero();
                assertThat(caregiverBrowser.read("/api/visits/" + visit + "/work-pack").path("visit").path("status").asString()).isEqualTo("SCHEDULED");
                assertThat(family.read("/api/notifications/me").path("totalElements").asInt()).isZero();
                assertThat(mailCount(email, "CareLink urgent care alert")).isZero();
            } finally { jdbc.execute("DROP TRIGGER fm05_channels_source_fault"); }
            long id = body(caregiverBrowser.command("POST", "/api/incidents", input), 201).path("report").path("id").asLong();
            assertSafeMail(awaitMail(email, "CareLink urgent care alert"), id);
            assertThat(mailCount(email, "CareLink urgent care alert")).isEqualTo(1);
            assertThat(notice(family, id).path("status").asString()).isEqualTo("SENT");
            assertEmptyReceipt(detail(family, id));
        }
    }

    @Test void realEscalationCreatesSeparateSafeMailWithoutResettingExistingReceipts() throws Exception {
        String email = address();
        try (var family = browser(familyAName); var manager = browser(managerName)) {
            verifyEmail(family, email);
            var report = sourceReport("CG04");
            awaitMail(email, "CareLink urgent care alert");
            var raised = notice(family, report.id()); var deadline = detail(family, report.id()).path("acknowledgeBy");
            var awareness = body(family.command("POST", "/api/incidents/" + report.id() + "/acknowledge", Map.of("responseNote", "Already informed")), 200);
            clock.at(START.plusSeconds(360));
            body(manager.command("POST", "/api/incidents/" + report.id() + "/escalate", Map.of("reason", "Private chain handling")), 200);
            assertSafeMail(awaitMail(email, "CareLink urgent alert: incident not taken up"), report.id());
            var inbox = family.read("/api/notifications/me");
            assertThat(inbox.path("totalElements").asInt()).isEqualTo(2);
            assertThat(inbox.path("items").valueStream().map(row -> row.path("eventType").asString()).toList())
                    .containsExactlyInAnyOrder("INCIDENT_RAISED", "INCIDENT_UNRESOLVED");
            assertThat(detail(family, report.id()).path("acknowledgement")).isEqualTo(awareness);
            assertThat(detail(family, report.id()).path("acknowledgeBy")).isEqualTo(deadline);
            assertThat(body(family.command("POST", "/api/notifications/" + raised.path("id").asLong() + "/read", null), 200).path("status").asString()).isEqualTo("READ");
            assertThat(mailCount(email, "CareLink urgent care alert")).isEqualTo(1);
            assertThat(mailCount(email, "CareLink urgent alert: incident not taken up")).isEqualTo(1);
        }
    }

    private Report sourceReport(String source) throws Exception {
        if (source.equals("CG04")) { return report(); }
        try (var elderBrowser = browser(elderName)) {
            long id = body(elderBrowser.command("POST", "/api/elders/me/emergency-calls", Map.of("description", DESCRIPTION,
                    "latitude", 1.2345678, "longitude", 103.1234567, "locationText", "Private fictional location")), 201).path("id").asLong();
            return new Report(id, 0, Map.of());
        }
    }
    private void assertSafeMail(JsonNode mail, long id) {
        assertThat(mail.path("Text").asString()).contains("http://127.0.0.1:5173/family/incidents/" + id)
                .doesNotContain(DESCRIPTION, "Private fictional location", "1.2345678", "103.1234567", "Private chain handling", "responderUserId");
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
    private long mailCount(String email, String subject) throws Exception {
        return mailGet("/api/v1/messages").path("messages").valueStream().filter(row -> row.path("Subject").asString().equals(subject)
                && row.path("To").valueStream().anyMatch(to -> to.path("Address").asString().equals(email))).count();
    }

    private void verifyEmail(Browser browser, String email) throws Exception {
        body(browser.command("POST", CONTACT, Map.of("email", email)), 200);
        var message = awaitMail(email, "Verify your CareLink notification email");
        var matcher = Pattern.compile("Verification code: ([a-f0-9]{64})").matcher(message.path("Text").asString());
        assertThat(matcher.find()).isTrue();
        body(browser.command("POST", CONTACT + "/verify", Map.of("token", matcher.group(1))), 200);
    }
    private JsonNode awaitMail(String email, String subject) throws Exception {
        Instant until = Instant.now().plusSeconds(10);
        do {
            for (var row : mailGet("/api/v1/messages").path("messages")) {
                if (row.path("Subject").asString().equals(subject)
                        && row.path("To").valueStream().anyMatch(to -> to.path("Address").asString().equals(email)))
                    return mailGet("/api/v1/message/" + row.path("ID").asString());
            }
            Thread.sleep(50);
        } while (Instant.now().isBefore(until));
        throw new AssertionError("SMTP did not accept " + subject + " for the fictional family");
    }
    private JsonNode mailGet(String path) throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            return body(client.send(HttpRequest.newBuilder(URI.create("http://" + MAIL.getHost() + ":" + MAIL.getMappedPort(8025) + path))
                    .timeout(Duration.ofSeconds(10)).GET().build(), HttpResponse.BodyHandlers.ofString()), 200);
        }
    }

    private String address() { return "family-" + UUID.randomUUID() + "@example.test"; }
    private JsonNode detail(Browser browser, long id) throws Exception { return browser.read("/api/family/incidents/" + id); }
    private JsonNode notice(Browser browser, long id) throws Exception {
        var page = browser.read("/api/notifications/me");
        assertThat(page.path("totalElements").asInt()).isEqualTo(1);
        var notice = page.path("items").get(0);
        assertThat(notice.path("resourceType").asString()).isEqualTo("INCIDENT");
        assertThat(notice.path("resourceId").asLong()).isEqualTo(id);
        return notice;
    }
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
