package sg.nus.carelink.incident.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
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

/** Real committed source, family HTTP and SMTP acceptance for independent alert channels.
 * SQL supplies synthetic identities/bindings and observes durable facts, never the source event.
 * @author Wang Zhili
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "carelink.report.schedule-cron=-", "carelink.roster.schedule-cron=-", "carelink.caregiver.expiry-scan-cron=-",
        "carelink.rerostering.scan-initial-delay=PT1H", "carelink.escalation.scan-initial-delay=PT1H",
        "carelink.roster.uncovered-scan-initial-delay=PT1H", "carelink.roster.leave-reminder-initial-delay=PT1H"
})
class FamilyIncidentEmailIT {
    private static final GenericContainer<?> MAIL = new GenericContainer<>(DockerImageName.parse("axllent/mailpit:v1.31.4"))
            .withExposedPorts(1025, 8025).withEnv("MP_ENABLE_CHAOS", "true").waitingFor(Wait.forHttp("/api/v1/info").forPort(8025));
    private static SmtpGate smtp;
    @Autowired private IncidentFamilyEvents events;
    @Autowired private PlatformTransactionManager transactions;
    private static final String CONTACT = "/api/family/notification-email";
    private static final String SOS = "/api/elders/me/emergency-calls";
    private static final String DESCRIPTION = "Fictional elder needs help at home.";
    @LocalServerPort private int port;
    @Autowired private JdbcTemplate jdbc;
    private final JsonMapper json = JsonMapper.builder().build();
    private String managerName, elderName, familyAName, familyBName;
    private long elder, familyA, familyB, familyAUser, familyBUser;

    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        SharedMySql.register(registry, FamilyIncidentEmailIT.class, "+05:00", "connectionTimeZone=Asia/Singapore");
        MAIL.start();
        smtp = new SmtpGate(MAIL.getHost(), MAIL.getMappedPort(1025));
        registry.add("spring.mail.host", () -> "127.0.0.1"); registry.add("spring.mail.port", smtp::port);
        registry.add("spring.mail.properties[mail.smtp.timeout]", () -> 10000);
        registry.add("carelink.family-email.enabled", () -> true);
        registry.add("carelink.family-email.from", () -> "carelink@example.test");
        registry.add("carelink.family-email.app-base-url", () -> "http://127.0.0.1:5173");
    }
    @BeforeEach void peopleOnly() {
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

    @Test void committedSosSendsSafeEmailAndLeavesInAppAndAwarenessIndependent() throws Exception {
        String email = "family-" + UUID.randomUUID() + "@example.test";
        try (var a = browser(familyAName)) {
            verifyEmail(a, email);
            long id = report(Map.of("description", DESCRIPTION, "latitude", 1.2345678,
                    "longitude", 103.1234567, "locationText", "Private fictional location"));
            var message = awaitMail(email, "CareLink urgent care alert");
            assertThat(message.path("Text").asString()).contains("http://127.0.0.1:5173/family/incidents/" + id)
                    .doesNotContain(DESCRIPTION, "Private fictional location", "1.2345678", "103.1234567");
            assertThat(notice(a, id).path("status").asString()).isEqualTo("SENT");
            assertThat(a.read("/api/notifications/me/unread-count").path("unread").asInt()).isEqualTo(1);
            assertEmptyReceipt(detail(a, id));
        }
    }
    @Test void concurrentReplayOfOneFactSendsOneEmailPerVerifiedFamily() throws Exception {
        String emailA = address(), emailB = address();
        try (var a = browser(familyAName); var b = browser(familyBName)) {
            verifyEmail(a, emailA); verifyEmail(b, emailB);
            long incident = incident(); UUID fact = UUID.randomUUID();
            var start = new CountDownLatch(1);
            var first = CompletableFuture.runAsync(() -> { await(start); publish(fact, incident); });
            var second = CompletableFuture.runAsync(() -> { await(start); publish(fact, incident); });
            start.countDown(); first.get(5, TimeUnit.SECONDS); second.get(5, TimeUnit.SECONDS);
            awaitMail(emailA, "CareLink urgent care alert"); awaitMail(emailB, "CareLink urgent care alert");
            var window = detail(a, incident).path("acknowledgeBy");
            publish(fact, incident);
            assertThat(mailCount(emailA, "CareLink urgent care alert")).isEqualTo(1);
            assertThat(mailCount(emailB, "CareLink urgent care alert")).isEqualTo(1);
            assertThat(notice(a, incident).path("status").asString()).isEqualTo("SENT");
            assertThat(notice(b, incident).path("status").asString()).isEqualTo("SENT");
            assertThat(detail(a, incident).path("acknowledgeBy")).isEqualTo(window);
        }
    }
    @ParameterizedTest @ValueSource(strings = {"binding", "email", "role", "account"})
    void sourceReturnsWhileSmtpWaitsAndQueuedRecipientIsRechecked(String revoked) throws Exception {
        String emailA = address(), emailB = address();
        try (var a = browser(familyAName); var b = browser(familyBName); var source = browser(elderName)) {
            verifyEmail(a, emailA); verifyEmail(b, emailB);
            var held = smtp.hold(emailA);
            var reported = CompletableFuture.supplyAsync(() -> {
                try { return report(Map.of("description", DESCRIPTION)); }
                catch (Exception failure) { throw new IllegalStateException(failure); }
            });
            long id;
            try {
                await(held.reached());
                // This completes before the SMTP gate is released: no timeout-based timing inference.
                id = reported.get(2, TimeUnit.SECONDS);
                if (revoked.equals("binding")) {
                    long binding = source.read("/api/elders/me/family-bindings").valueStream()
                            .filter(row -> row.path("familyMemberId").asLong() == familyB).findFirst().orElseThrow().path("id").asLong();
                    body(source.command("DELETE", "/api/elders/me/family-bindings/" + binding, null), 200);
                } else if (revoked.equals("email")) body(b.command("DELETE", CONTACT, null), 200);
                else if (revoked.equals("role")) jdbc.update("DELETE FROM user_role WHERE user_id=? AND role='FAMILY'", familyBUser);
                else jdbc.update("UPDATE app_user SET enabled=false WHERE id=?", familyBUser);
                assertThat(notice(a, id).path("status").asString()).isEqualTo("SENT");
            } finally { held.release().countDown(); }
            awaitMail(emailA, "CareLink urgent care alert");
            // A later accepted message is a FIFO SMTP barrier for the original queued recipient.
            publish(UUID.randomUUID(), incident()); awaitCount(emailA, "CareLink urgent care alert", 2);
            assertThat(mailCount(emailB, "CareLink urgent care alert")).isZero();
            assertEmptyReceipt(detail(a, id));
        }
    }
    @Test void rejectedSmtpDoesNotUndoInboxAndReplayingItDoesNotRetry() throws Exception {
        String emailA = address(), emailB = address();
        try (var a = browser(familyAName); var b = browser(familyBName)) {
            verifyEmail(a, emailA); verifyEmail(b, emailB);
            long id = incident(); UUID fact = UUID.randomUUID();
            chaos(Map.of("Recipient", Map.of("ErrorCode", 550, "Probability", 100)));
            try {
                var heldA = smtp.hold(emailA); publish(fact, id); await(heldA.reached());
                var heldB = smtp.hold(emailB); heldA.release().countDown();
                await(heldB.reached()); heldB.release().countDown(); await(heldB.closed());
            } finally { chaos(Map.of()); }
            var original = detail(a, id).path("acknowledgeBy");
            publish(fact, id);
            long next = incident(); publish(UUID.randomUUID(), next);
            awaitMail(emailA, "CareLink urgent care alert"); awaitMail(emailB, "CareLink urgent care alert");
            assertThat(mailCount(emailA, "CareLink urgent care alert")).isEqualTo(1);
            assertThat(mailCount(emailB, "CareLink urgent care alert")).isEqualTo(1);
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(2);
            assertThat(b.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(2);
            assertThat(detail(a, id).path("acknowledgeBy")).isEqualTo(original);
            assertEmptyReceipt(detail(a, id));
        }
    }
    @Test void smtpAcceptanceThenOutcomeWriteFailureIsNotReplayedAsAnotherSend() throws Exception {
        String email = address();
        try (var a = browser(familyAName)) {
            verifyEmail(a, email);
            long id = incident(); UUID fact = UUID.randomUUID();
            jdbc.execute("CREATE TRIGGER fm05_email_result_fault BEFORE UPDATE ON family_alert_email_delivery FOR EACH ROW BEGIN IF NEW.status='ACCEPTED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic email outcome failure'; END IF; END");
            try {
                publish(fact, id); awaitMail(email, "CareLink urgent care alert");
                publish(fact, id);
                // A new fact establishes that the first task has completed, even if its ACCEPTED write failed.
                publish(UUID.randomUUID(), incident()); awaitCount(email, "CareLink urgent care alert", 2);
                assertThat(mailCount(email, "CareLink urgent care alert")).isEqualTo(2);
                assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(2);
                assertEmptyReceipt(detail(a, id));
            } finally { jdbc.execute("DROP TRIGGER fm05_email_result_fault"); }
        }
    }
    @Test void anInboxFailureDoesNotSuppressOptionalEmailOrAnotherFamilysInbox() throws Exception {
        String email = address();
        try (var a = browser(familyAName); var b = browser(familyBName)) {
            verifyEmail(a, email);
            jdbc.execute("CREATE TRIGGER fm05_email_inbox_fault BEFORE INSERT ON notification FOR EACH ROW BEGIN IF NEW.recipient_user_id="
                    + familyAUser + " AND NEW.resource_type='INCIDENT' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic inbox failure'; END IF; END");
            try {
                long id = report(Map.of()); awaitMail(email, "CareLink urgent care alert");
                assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isZero();
                assertThat(notice(b, id).path("status").asString()).isEqualTo("SENT");
                assertEmptyReceipt(detail(a, id));
            } finally { jdbc.execute("DROP TRIGGER fm05_email_inbox_fault"); }
        }
    }
    @Test void unresolvedIsAnotherEmailFactAndDoesNotChangeOriginalAwarenessWindow() throws Exception {
        String email = address();
        try (var a = browser(familyAName); var b = browser(familyBName)) {
            verifyEmail(a, email);
            jdbc.update("DELETE FROM user_role WHERE role='MANAGER'");
            long id = report(Map.of());
            awaitMail(email, "CareLink urgent care alert");
            awaitMail(email, "CareLink urgent alert: incident not taken up");
            var detail = detail(a, id); var window = detail.path("acknowledgeBy");
            assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(2);
            assertThat(b.read("/api/notifications/me").path("totalElements").asInt()).isEqualTo(2);
            var aware = body(a.command("POST", "/api/incidents/" + id + "/acknowledge", Map.of("responseNote", "Aware")), 200);
            assertThat(aware.path("viewedAt").isNull()).isTrue();
            assertThat(detail(a, id).path("acknowledgeBy")).isEqualTo(window);
            assertThat(detail(a, id).path("status").asString()).isEqualTo("UNRESOLVED_ESCALATED");
            assertThat(a.read("/api/notifications/me/unread-count").path("unread").asInt()).isEqualTo(2);
        }
    }
    @Test void rolledBackPublicationAndUnverifiedContactProduceNoEmail() throws Exception {
        String emailA = address(), emailB = address();
        try (var a = browser(familyAName); var b = browser(familyBName)) {
            verifyEmail(a, emailA);
            body(b.command("POST", CONTACT, Map.of("email", emailB)), 200);
            long id = incident(); UUID fact = UUID.randomUUID();
            new TransactionTemplate(transactions).executeWithoutResult(status -> {
                events.raised(fact, id, elder, OffsetDateTime.parse("2026-10-08T16:00:00+08:00")); status.setRollbackOnly();
            });
            long committed = incident(); publish(UUID.randomUUID(), committed);
            awaitMail(emailA, "CareLink urgent care alert");
            assertThat(mailCount(emailA, "CareLink urgent care alert")).isEqualTo(1);
            assertThat(mailCount(emailB, "CareLink urgent care alert")).isZero();
            assertThat(notice(a, committed).path("status").asString()).isEqualTo("SENT");
            assertThat(notice(b, committed).path("status").asString()).isEqualTo("SENT");
        }
    }
    @Test void emailClaimStorageFailureLeavesCommittedSourceAndMandatoryInboxIntact() throws Exception {
        String email = address();
        try (var a = browser(familyAName); var b = browser(familyBName)) {
            verifyEmail(a, email);
            jdbc.execute("CREATE TRIGGER fm05_email_claim_fault BEFORE INSERT ON family_alert_email_delivery FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic email claim failure'");
            long id;
            try {
                id = report(Map.of());
                assertThat(notice(a, id).path("status").asString()).isEqualTo("SENT");
                assertThat(notice(b, id).path("status").asString()).isEqualTo("SENT");
            } finally { jdbc.execute("DROP TRIGGER fm05_email_claim_fault"); }
            publish(UUID.randomUUID(), incident()); awaitMail(email, "CareLink urgent care alert");
            assertThat(mailCount(email, "CareLink urgent care alert")).isEqualTo(1);
            assertEmptyReceipt(detail(a, id));
        }
    }
    private void awaitCount(String email, String subject, long count) throws Exception {
        Instant until = Instant.now().plusSeconds(10);
        while (mailCount(email, subject) < count && Instant.now().isBefore(until)) Thread.sleep(50);
        assertThat(mailCount(email, subject)).isEqualTo(count);
    }
    private void chaos(Map<String, ?> settings) throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            body(client.send(HttpRequest.newBuilder(URI.create("http://" + MAIL.getHost() + ":" + MAIL.getMappedPort(8025) + "/api/v1/chaos"))
                    .header("Content-Type", "application/json").PUT(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(settings))).build(), HttpResponse.BodyHandlers.ofString()), 200);
        }
    }
    @AfterAll static void stopSmtpGate() throws Exception { if (smtp != null) smtp.listener.close(); }

    private long incident() {
        return insert("INSERT INTO incident(elder_id,source,category,severity,status,description,reported_at) VALUES (?,'CAREGIVER','FALL','HIGH','OPEN',?,?)",
                elder, DESCRIPTION, java.time.LocalDateTime.of(2026, 10, 8, 16, 0));
    }
    private void publish(UUID fact, long incident) {
        new TransactionTemplate(transactions).executeWithoutResult(status -> events.raised(fact, incident, elder,
                OffsetDateTime.parse("2026-10-08T16:00:00+08:00")));
    }
    private String address() { return "family-" + UUID.randomUUID() + "@example.test"; }
    private static void await(CountDownLatch latch) {
        try { if (!latch.await(5, TimeUnit.SECONDS)) throw new AssertionError("SMTP gate or race timed out"); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw new IllegalStateException(interrupted); }
    }
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

    private long report(Map<String, ?> payload) throws Exception {
        try (var elder = browser(elderName)) { return body(elder.command("POST", SOS, payload), 201).path("id").asLong(); }
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
    /** A controllable external TCP/SMTP boundary, forwarding actual mail to Mailpit. No application collaborator is mocked. */
    private static class SmtpGate {
        private final ServerSocket listener;
        private final String host;
        private final int upstreamPort;
        private volatile Gate gate;
        SmtpGate(String host, int upstreamPort) {
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
        Gate hold(String address) { var next = new Gate(address, new CountDownLatch(1), new CountDownLatch(1), new CountDownLatch(1)); gate = next; return next; }
        private void forward(Socket client) {
            Gate observed = null;
            try (client; var upstream = new Socket(host, upstreamPort)) {
                var response = Thread.ofVirtual().start(() -> {
                    try { upstream.getInputStream().transferTo(client.getOutputStream()); }
                    catch (java.io.IOException _) { /* A closed SMTP connection is an external failure. */ }
                });
                var input = new BufferedReader(new InputStreamReader(client.getInputStream(), StandardCharsets.UTF_8));
                var output = upstream.getOutputStream();
                for (String line; (line = input.readLine()) != null;) {
                    var current = gate;
                    if (current != null && line.startsWith("RCPT TO:") && line.contains(current.address())) {
                        gate = null; observed = current; current.reached().countDown(); await(current.release());
                    }
                    output.write((line + "\r\n").getBytes(StandardCharsets.UTF_8)); output.flush();
                }
                response.join(1000);
            } catch (java.io.IOException _) { /* The production sender observes timeout or rejection. */ }
            catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); }
            finally { if (observed != null) observed.closed().countDown(); }
        }
        private record Gate(String address, CountDownLatch reached, CountDownLatch release, CountDownLatch closed) { }
    }

}
