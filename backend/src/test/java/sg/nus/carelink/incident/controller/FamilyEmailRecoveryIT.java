package sg.nus.carelink.incident.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Clock;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.scheduling.annotation.Scheduled;
import sg.nus.carelink.incident.application.FamilyEmailRecoveryService;
import org.junit.jupiter.api.AfterAll;
import org.springframework.beans.factory.annotation.Autowired;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;
import java.util.regex.Pattern;
import java.net.ServerSocket;
import java.net.Socket;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import sg.nus.carelink.incident.application.IncidentFamilyEvents;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import sg.nus.carelink.testsupport.SharedMySql;

/** Real timer recovery observed through production event publication, family HTTP and SMTP.
 * SQL supplies synthetic identities/bindings and observes durable facts, never the source event.
 * @author Wang Zhili
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "carelink.report.schedule-cron=-", "carelink.roster.schedule-cron=-", "carelink.caregiver.expiry-scan-cron=-",
        "carelink.rerostering.scan-initial-delay=PT1H", "carelink.escalation.scan-initial-delay=PT1H",
        "carelink.roster.uncovered-scan-initial-delay=PT1H", "carelink.roster.leave-reminder-initial-delay=PT1H",
        "spring.task.scheduling.pool.size=2", "carelink.family-email.scan-interval=PT0.1S", "carelink.family-email.scan-initial-delay=PT0.1S"
})
@Import(FamilyEmailRecoveryIT.TimeConfiguration.class)
class FamilyEmailRecoveryIT {
    private static final Instant START = Instant.parse("2026-10-08T08:00:00Z");
    @Autowired private RetryClock clock;
    @TestConfiguration(proxyBeanMethods = false) static class TimeConfiguration {
        @Bean @Primary RetryClock retryClock() { return new RetryClock(); }
        @Bean CompetingTimer competingTimer(FamilyEmailRecoveryService service) { return new CompetingTimer(service); }
    }
    static class CompetingTimer {
        private final FamilyEmailRecoveryService service;
        CompetingTimer(FamilyEmailRecoveryService service) { this.service = service; }
        @Scheduled(fixedDelay = 100, initialDelay = 100) void sweep() { service.sweep(); }
    }
    static class RetryClock extends Clock {
        private volatile Instant time = START;
        @Override public ZoneId getZone() { return ZoneId.of("UTC"); }
        @Override public Clock withZone(ZoneId zone) { return Clock.fixed(time, zone); }
        @Override public Instant instant() { return time; }
    }
    private static final GenericContainer<?> MAIL = new GenericContainer<>(DockerImageName.parse("axllent/mailpit:v1.31.4"))
            .withExposedPorts(1025, 8025).withEnv("MP_ENABLE_CHAOS", "true").waitingFor(Wait.forHttp("/api/v1/info").forPort(8025));
    private static SmtpProbe smtp;
    @Autowired private IncidentFamilyEvents events;
    @Autowired private PlatformTransactionManager transactions;
    private static final String CONTACT = "/api/family/notification-email";
    private static final String DESCRIPTION = "Fictional elder needs help at home.";
    @LocalServerPort private int port;
    @Autowired private JdbcTemplate jdbc;
    private final JsonMapper json = JsonMapper.builder().build();
    private String managerName, elderName, familyAName, familyBName;
    private long elder, familyA, familyB, familyAUser, familyBUser;

    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        SharedMySql.register(registry, FamilyEmailRecoveryIT.class, "+05:00", "connectionTimeZone=Asia/Singapore");
        MAIL.start();
        smtp = new SmtpProbe(MAIL.getHost(), MAIL.getMappedPort(1025));
        registry.add("spring.mail.host", () -> "127.0.0.1"); registry.add("spring.mail.port", smtp::port);
        registry.add("spring.mail.properties[mail.smtp.timeout]", () -> 10000);
        registry.add("carelink.family-email.enabled", () -> true);
        registry.add("carelink.family-email.from", () -> "carelink@example.test");
        registry.add("carelink.family-email.app-base-url", () -> "http://127.0.0.1:5173");
    }
    @BeforeEach void peopleOnly() throws Exception {
        clock.time = START; chaos(Map.of());
        smtp.clock = clock;
        jdbc.update("UPDATE elder_family_binding SET status='REVOKED'");
        // The class owns a fresh SharedMySql database; prior managers must not take this scenario's incident.
        jdbc.update("DELETE FROM user_role WHERE role='MANAGER'");
        jdbc.update("UPDATE caregiver SET status='INACTIVE'");
        String run = UUID.randomUUID().toString().substring(0, 8);
        managerName = "fm05-manager-" + run;
        elderName = "fm05-elder-" + run; familyAName = "fm05-family-a-" + run; familyBName = "fm05-family-b-" + run;
        account(managerName, "MANAGER");
        elder = insert("INSERT INTO elder(user_id,full_name,sector,preferred_dialects) VALUES (?,'Fictional elder','North','English')", account(elderName, "ELDER"));
        familyAUser = account(familyAName, "FAMILY"); familyBUser = account(familyBName, "FAMILY");
        familyA = relative(familyAUser, "FULL"); familyB = relative(familyBUser, "READ_ONLY");
    }

    @Test void temporarySmtpRejectionRetriesAfterTheIntervalWithoutReplayingTheSource() throws Exception {
        String email = address();
        try (var a = browser(familyAName)) {
            verifyEmail(a, email); smtp.attempts.remove(email);
            chaos(Map.of("Recipient", Map.of("ErrorCode", 450, "Probability", 100)));
            long id = incident(); publish(UUID.randomUUID(), id);
            awaitAttempts(email, 1);
            var original = detail(a, id).path("acknowledgeBy");
            clock.time = START.plusSeconds(59); Thread.sleep(400);
            assertThat(smtp.attempts.get(email)).hasSize(1);
            chaos(Map.of());
            awaitRecoveryMail(email);
            assertThat(smtp.attempts.get(email)).hasSize(2);
            assertThat(Duration.between(smtp.attempts.get(email).getFirst(), smtp.attempts.get(email).get(1)).getSeconds()).isGreaterThanOrEqualTo(60);
            assertThat(notice(a, id).path("status").asString()).isEqualTo("SENT");
            assertThat(detail(a, id).path("acknowledgeBy")).isEqualTo(original);
            assertEmptyReceipt(detail(a, id));
        } finally { chaos(Map.of()); }
    }
    @Test void temporaryFailuresStopAfterThreeAttemptsEvenWhenSmtpLaterRecovers() throws Exception {
        String email = address();
        try (var a = browser(familyAName)) {
            verifyEmail(a, email); smtp.attempts.remove(email);
            chaos(Map.of("Recipient", Map.of("ErrorCode", 450, "Probability", 100)));
            long id = incident(); publish(UUID.randomUUID(), id);
            advanceUntilAttempts(email, 3); Thread.sleep(300);
            chaos(Map.of()); clock.time = clock.time.plusSeconds(600); Thread.sleep(500);
            assertThat(smtp.attempts.get(email)).hasSize(3);
            assertThat(mailCount(email, "CareLink urgent care alert")).isZero();
            long next = incident(); publish(UUID.randomUUID(), next);
            var accepted = awaitMail(email, "CareLink urgent care alert");
            assertThat(accepted.path("Text").asString()).contains("/family/incidents/" + next);
            assertThat(smtp.attempts.get(email)).hasSize(4);
            assertEmptyReceipt(detail(a, id));
        } finally { chaos(Map.of()); }
    }
    @ParameterizedTest @ValueSource(strings = {"binding", "email", "role", "account"})
    void retryStopsWhenTheCurrentRecipientLosesEligibility(String removed) throws Exception {
        String email = address();
        try (var a = browser(familyAName); var source = browser(elderName)) {
            verifyEmail(a, email); smtp.attempts.remove(email);
            chaos(Map.of("Recipient", Map.of("ErrorCode", 450, "Probability", 100)));
            long id = incident(); publish(UUID.randomUUID(), id); awaitAttempts(email, 1);
            if (removed.equals("email")) body(a.command("DELETE", CONTACT, null), 200);
            else if (removed.equals("binding")) {
                long binding = source.read("/api/elders/me/family-bindings").valueStream()
                        .filter(row -> row.path("familyMemberId").asLong() == familyA).findFirst().orElseThrow().path("id").asLong();
                body(source.command("DELETE", "/api/elders/me/family-bindings/" + binding, null), 200);
            } else if (removed.equals("role")) jdbc.update("DELETE FROM user_role WHERE user_id=? AND role='FAMILY'", familyAUser);
            else jdbc.update("UPDATE app_user SET enabled=false WHERE id=?", familyAUser);
            Thread.sleep(300); chaos(Map.of());
            clock.time = START.plusSeconds(600); Thread.sleep(700);
            assertThat(smtp.attempts.get(email)).hasSize(1);
            assertThat(mailCount(email, "CareLink urgent care alert")).isZero();
        } finally { chaos(Map.of()); }
    }
    @ParameterizedTest @ValueSource(strings = {"QUEUED", "QUEUE_REJECTED"})
    void competingScannersRecoverPersistedWorkOnceWithoutCreatingAnotherInboxNotice(String saved) throws Exception {
        String email = address();
        try (var a = browser(familyAName)) {
            verifyEmail(a, email); smtp.attempts.remove(email);
            long id = incident(); savedWork(id, saved.equals("QUEUED") ? "QUEUED" : "FAILED", saved.equals("QUEUED") ? null : saved, 61);
            awaitMail(email, "CareLink urgent care alert");
            clock.time = START.plusSeconds(1200); Thread.sleep(500);
            assertThat(smtp.attempts.get(email)).hasSize(1);
            assertThat(notice(a, id).path("status").asString()).isEqualTo("SENT");
            assertEmptyReceipt(detail(a, id));
            assertThat(detail(a, id).path("acknowledgeBy").asString()).isEqualTo("2026-10-08T18:00:00+08:00");
        }
    }
    @ParameterizedTest @ValueSource(strings = {"SENDING", "UNKNOWN", "ACCEPTED", "SMTP_PERMANENT_REJECTED", "SKIPPED"})
    void staleOrTerminalFactsDoNotBecomeAnotherSmtpSend(String saved) throws Exception {
        String email = address();
        try (var a = browser(familyAName)) {
            verifyEmail(a, email); smtp.attempts.remove(email);
            long id = incident(); savedWork(id, saved.equals("SMTP_PERMANENT_REJECTED") ? "FAILED" : saved,
                    saved.equals("SMTP_PERMANENT_REJECTED") ? saved : null, 301);
            clock.time = START.plusSeconds(1200); Thread.sleep(600);
            assertThat(smtp.attempts.getOrDefault(email, List.of())).isEmpty();
            assertThat(notice(a, id).path("status").asString()).isEqualTo("SENT");
            assertEmptyReceipt(detail(a, id));
        }
    }
    @Test void actualPermanentSmtpRejectionIsNotAutomaticallyRetried() throws Exception {
        String email = address();
        try (var a = browser(familyAName)) {
            verifyEmail(a, email); smtp.attempts.remove(email);
            chaos(Map.of("Recipient", Map.of("ErrorCode", 550, "Probability", 100)));
            long id = incident(); publish(UUID.randomUUID(), id); awaitAttempts(email, 1);
            Thread.sleep(300); chaos(Map.of()); clock.time = START.plusSeconds(1200); Thread.sleep(600);
            assertThat(smtp.attempts.get(email)).hasSize(1);
            assertThat(mailCount(email, "CareLink urgent care alert")).isZero();
            assertThat(notice(a, id).path("status").asString()).isEqualTo("SENT");
        } finally { chaos(Map.of()); }
    }
    @Test void acceptedMailWithFailedOutcomeRecordingIsNotRetriedByTheRecoveryTimer() throws Exception {
        String email = address();
        try (var a = browser(familyAName)) {
            verifyEmail(a, email); smtp.attempts.remove(email);
            jdbc.execute("CREATE TRIGGER fm05_retry_result_fault BEFORE UPDATE ON family_alert_email_delivery FOR EACH ROW BEGIN IF NEW.status='ACCEPTED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic outcome failure'; END IF; END");
            long id = incident();
            try { publish(UUID.randomUUID(), id); awaitMail(email, "CareLink urgent care alert"); Thread.sleep(300); }
            finally { jdbc.execute("DROP TRIGGER fm05_retry_result_fault"); }
            clock.time = START.plusSeconds(1200); Thread.sleep(600);
            assertThat(smtp.attempts.get(email)).hasSize(1);
            assertThat(mailCount(email, "CareLink urgent care alert")).isEqualTo(1);
            assertEmptyReceipt(detail(a, id));
        }
    }
    private void advanceUntilAttempts(String email, int expected) throws Exception {
        for (int tick = 0; tick < 20 && smtp.attempts.getOrDefault(email, List.of()).size() < expected; tick++) {
            clock.time = clock.time.plusSeconds(60); Thread.sleep(150);
        }
        awaitAttempts(email, expected);
    }
    private void savedWork(long id, String state, String reason, long age) {
        // A committed checkpoint from a former process, not a call to private delivery methods.
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            UUID event = UUID.randomUUID(), attempt = UUID.randomUUID();
            var now = java.time.LocalDateTime.of(2026, 10, 8, 16, 0);
            jdbc.update("INSERT INTO family_alert_event(event_id,event_type,incident_id,elder_id,occurred_at,state,last_attempt_at) VALUES (?,'INCIDENT_RAISED',?,?,?,'PROCESSED',?)",
                    event.toString(), id, elder, java.sql.Timestamp.valueOf(now), java.sql.Timestamp.valueOf(now));
            long notice = insert("INSERT INTO notification(recipient_user_id,event_type,channel,title,body,resource_type,resource_id,status,created_at) VALUES (?,'INCIDENT_RAISED','IN_APP','Care alert','A saved alert','INCIDENT',?,'SENT',?)", familyAUser, id, now);
            jdbc.update("INSERT INTO family_alert_window(incident_id,family_member_id,first_notification_id,opened_at,acknowledge_by) VALUES (?,?,?,?,?)", id, familyA, notice, java.sql.Timestamp.valueOf(now), java.sql.Timestamp.valueOf(now.plusHours(2)));
            jdbc.update("INSERT INTO family_alert_email_delivery(event_id,family_member_id,attempt_id,status,reason,attempted_at,next_attempt_at) VALUES (?,?,?,?,?,?,?)",
                    event.toString(), familyA, attempt.toString(), state, reason, now.minusSeconds(age), now.minusSeconds(1));
            jdbc.update("INSERT INTO family_alert_email_attempt(attempt_id,event_id,family_member_id,attempt_number,status,reason,attempted_at) VALUES (?,?,?,1,?,?,?)",
                    attempt.toString(), event.toString(), familyA, state, reason, now.minusSeconds(age));
        });
    }
    private void awaitAttempts(String email, int expected) throws Exception {
        Instant until = Instant.now().plusSeconds(5);
        while (smtp.attempts.getOrDefault(email, List.of()).size() < expected && Instant.now().isBefore(until)) Thread.sleep(20);
        assertThat(smtp.attempts.getOrDefault(email, List.of())).hasSize(expected);
    }
    private void awaitRecoveryMail(String email) throws Exception {
        for (int tick = 0; tick < 12 && mailCount(email, "CareLink urgent care alert") == 0; tick++) {
            clock.time = clock.time.plusSeconds(60); Thread.sleep(150);
        }
        awaitMail(email, "CareLink urgent care alert");
    }
    private void chaos(Map<String, ?> settings) throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            body(client.send(HttpRequest.newBuilder(URI.create("http://" + MAIL.getHost() + ":" + MAIL.getMappedPort(8025) + "/api/v1/chaos"))
                    .header("Content-Type", "application/json").PUT(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(settings))).build(), HttpResponse.BodyHandlers.ofString()), 200);
        }
    }
    @AfterAll static void stopSmtpProbe() throws Exception { if (smtp != null) smtp.listener.close(); }

    private long incident() {
        return insert("INSERT INTO incident(elder_id,source,category,severity,status,description,reported_at) VALUES (?,'CAREGIVER','FALL','HIGH','OPEN',?,?)",
                elder, DESCRIPTION, java.time.LocalDateTime.of(2026, 10, 8, 16, 0));
    }
    private void publish(UUID fact, long incident) {
        new TransactionTemplate(transactions).executeWithoutResult(status -> events.raised(fact, incident, elder,
                OffsetDateTime.parse("2026-10-08T16:00:00+08:00")));
    }
    private String address() { return "family-" + UUID.randomUUID() + "@example.test"; }
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
    /** An observable external TCP/SMTP boundary, forwarding actual mail to Mailpit. No application collaborator is mocked. */
    private static class SmtpProbe {
        private final ServerSocket listener;
        private final String host;
        private final int upstreamPort;
        private volatile Clock clock;
        private final Map<String, List<Instant>> attempts = new ConcurrentHashMap<>();
        SmtpProbe(String host, int upstreamPort) {
            this.host = host; this.upstreamPort = upstreamPort;
            try { listener = new ServerSocket(0, 50, java.net.InetAddress.getLoopbackAddress()); }
            catch (java.io.IOException failure) { throw new IllegalStateException(failure); }
            Thread.ofVirtual().start(() -> {
                while (!listener.isClosed()) {
                    try {
                        Socket client = listener.accept();
                        Thread.ofVirtual().start(() -> forward(client));
                    } catch (java.io.IOException _) { return; }
                }
            });
        }
        int port() { return listener.getLocalPort(); }
        private void forward(Socket client) {
            try (client; var upstream = new Socket(host, upstreamPort)) {
                var response = Thread.ofVirtual().start(() -> {
                    try { upstream.getInputStream().transferTo(client.getOutputStream()); }
                    catch (java.io.IOException _) { /* A closed SMTP connection is an external failure. */ }
                });
                var input = new BufferedReader(new InputStreamReader(client.getInputStream(), StandardCharsets.UTF_8));
                var output = upstream.getOutputStream();
                for (String line; (line = input.readLine()) != null;) {
                    if (line.startsWith("RCPT TO:")) {
                        String recipient = line.substring(line.indexOf('<') + 1, line.indexOf('>'));
                        attempts.computeIfAbsent(recipient, _ -> new CopyOnWriteArrayList<>()).add(clock.instant());
                    }
                    output.write((line + "\r\n").getBytes(StandardCharsets.UTF_8)); output.flush();
                }
                response.join(1000);
            } catch (java.io.IOException _) { /* The production sender observes timeout or rejection. */ }
            catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); }
        }
    }

}
