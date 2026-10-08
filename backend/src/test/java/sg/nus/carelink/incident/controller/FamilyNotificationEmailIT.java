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
import java.time.Clock;
import java.time.ZoneId;
import java.util.regex.Pattern;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import sg.nus.carelink.testsupport.SharedMySql;

/** Family-owned contact verification through real login/CSRF, MySQL and local SMTP.
 * SQL supplies synthetic identities/bindings and observes durable facts, never the source event.
 * @author Wang Zhili
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"carelink.report.schedule-cron=-", "carelink.roster.schedule-cron=-", "carelink.caregiver.expiry-scan-cron=-",
		"carelink.rerostering.scan-initial-delay=PT1H", "carelink.escalation.scan-initial-delay=PT1H",
		"carelink.roster.uncovered-scan-initial-delay=PT1H", "carelink.roster.leave-reminder-initial-delay=PT1H"
})
@Import(FamilyNotificationEmailIT.TimeConfiguration.class)
class FamilyNotificationEmailIT {
	private static final String CONTACT = "/api/family/notification-email";
	private static final Instant START = Instant.parse("2026-10-08T08:00:00Z");
	private static final GenericContainer<?> MAIL = new GenericContainer<>(DockerImageName.parse("axllent/mailpit:v1.31.4"))
			.withExposedPorts(1025, 8025).withEnv("MP_ENABLE_CHAOS", "true").waitingFor(Wait.forHttp("/api/v1/info").forPort(8025));
	@Autowired private EmailClock clock;
	@LocalServerPort private int port;
	@Autowired private JdbcTemplate jdbc;
	private final JsonMapper json = JsonMapper.builder().build();
	private String managerName, familyAName, familyBName;
	private long familyAUser;

	@DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
		SharedMySql.register(registry, FamilyNotificationEmailIT.class, "+05:00", "connectionTimeZone=Asia/Singapore");
		MAIL.start();
		registry.add("spring.mail.host", MAIL::getHost); registry.add("spring.mail.port", () -> MAIL.getMappedPort(1025));
		registry.add("carelink.family-email.enabled", () -> true);
		registry.add("carelink.family-email.from", () -> "carelink@example.test");
	}
	@TestConfiguration(proxyBeanMethods = false) static class TimeConfiguration {
		@Bean @Primary EmailClock emailClock() { return new EmailClock(); }
	}
	static class EmailClock extends Clock {
		private Instant time = START;
		@Override public ZoneId getZone() { return ZoneId.of("UTC"); }
		@Override public Clock withZone(ZoneId zone) { return Clock.fixed(time, zone); }
		@Override public Instant instant() { return time; }
	}
	@BeforeEach void peopleOnly() throws Exception {
		chaos(Map.of());
		clock.time = START;
		String run = UUID.randomUUID().toString().substring(0, 8);
		managerName = "fm05-manager-" + run;
		familyAName = "fm05-family-a-" + run; familyBName = "fm05-family-b-" + run;
		account(managerName, "MANAGER");
		familyAUser = account(familyAName, "FAMILY"); long familyBUser = account(familyBName, "FAMILY");
		relative(familyAUser); relative(familyBUser);
	}

	@Test void addressIsNotVerifiedUntilItsMailedTokenIsSubmittedByTheSameFamily() throws Exception {
		String email = "family-" + UUID.randomUUID() + "@example.test";
		try (var a = browser(familyAName); var b = browser(familyBName)) {
			var empty = a.read(CONTACT);
			assertThat(empty.path("email").isNull()).isTrue();
			assertThat(empty.path("configured").asBoolean()).isTrue();
			assertThat(empty.path("urgentAlertsConfigured").asBoolean()).isFalse();
			var pending = body(a.command("POST", CONTACT, Map.of("email", email)), 200);
			assertThat(pending.path("email").asString()).isEqualTo(email);
			assertThat(pending.path("verifiedAt").isNull()).isTrue();
			assertThat(pending.path("verificationExpiresAt").asString()).isEqualTo("2026-10-08T16:15:00+08:00");
			assertThat(pending.propertyNames()).doesNotContain("token", "tokenHash", "familyMemberId");
			var message = mailFor(email);
			assertThat(message.path("Subject").asString()).isEqualTo("Verify your CareLink notification email");
			String token = token(message);
			assertThat(b.command("POST", CONTACT + "/verify", Map.of("token", token)).statusCode()).isEqualTo(409);
			var verified = body(a.command("POST", CONTACT + "/verify", Map.of("token", token)), 200);
			assertThat(verified.path("verifiedAt").asString()).isEqualTo("2026-10-08T16:00:00+08:00");
			assertThat(verified.path("verificationExpiresAt").isNull()).isTrue();
			assertThat(a.read(CONTACT)).isEqualTo(verified);
			assertThat(b.read(CONTACT).path("email").isNull()).isTrue();
			assertThat(a.read("/api/notifications/me").path("totalElements").asInt()).isZero();
		}
	}

	@Test void expiredAndConsumedCodesCannotVerifyAnAddress() throws Exception {
		String email = address();
		try (var a = browser(familyAName)) {
			body(a.command("POST", CONTACT, Map.of("email", email)), 200);
			String old = token(mailFor(email)); clock.time = START.plusSeconds(900);
			body(a.command("POST", CONTACT + "/verify", Map.of("token", old)), 409);
			assertThat(a.read(CONTACT).path("verifiedAt").isNull()).isTrue();
			body(a.command("POST", CONTACT, Map.of("email", email)), 200);
			String fresh = token(mailFor(email)); assertThat(fresh).isNotEqualTo(old);
			body(a.command("POST", CONTACT + "/verify", Map.of("token", fresh)), 200);
			body(a.command("POST", CONTACT + "/verify", Map.of("token", fresh)), 409);
		}
	}
	@Test void changesResendsAndRemovalInvalidatePreviousProofWithoutBypassingCooldown() throws Exception {
		String first = address(), next = address();
		try (var a = browser(familyAName)) {
			body(a.command("POST", CONTACT, Map.of("email", first)), 200);
			String old = token(mailFor(first)); body(a.command("POST", CONTACT + "/verify", Map.of("token", old)), 200);
			body(a.command("POST", CONTACT, Map.of("email", next)), 409);
			assertThat(a.read(CONTACT).path("email").asString()).isEqualTo(first);
			clock.time = START.plusSeconds(60);
			body(a.command("POST", CONTACT, Map.of("email", next)), 200);
			body(a.command("POST", CONTACT + "/verify", Map.of("token", old)), 409);
			String replaced = token(mailFor(next));
			assertThat(a.read(CONTACT).path("verifiedAt").isNull()).isTrue();
			clock.time = START.plusSeconds(120);
			body(a.command("POST", CONTACT, Map.of("email", next)), 200);
			body(a.command("POST", CONTACT + "/verify", Map.of("token", replaced)), 409);
			String fresh = token(mailFor(next));
			body(a.command("POST", CONTACT + "/verify", Map.of("token", fresh)), 200);
			assertThat(body(a.command("DELETE", CONTACT, null), 200).path("email").isNull()).isTrue();
			body(a.command("POST", CONTACT + "/verify", Map.of("token", fresh)), 409);
			body(a.command("POST", CONTACT, Map.of("email", next)), 409);
		}
	}
	@Test void smtpRejectionRollsBackAChangeAndDoesNotReportSuccessfulVerificationMail() throws Exception {
		String email = address(), rejected = address();
		try (var a = browser(familyAName)) {
			body(a.command("POST", CONTACT, Map.of("email", email)), 200);
			var saved = body(a.command("POST", CONTACT + "/verify", Map.of("token", token(mailFor(email)))), 200);
			clock.time = START.plusSeconds(60);
			chaos(Map.of("Recipient", Map.of("ErrorCode", 550, "Probability", 100)));
			try {
				var failed = body(a.command("POST", CONTACT, Map.of("email", rejected)), 503);
				assertThat(failed.toString()).doesNotContain(email, rejected, "550");
				assertThat(a.read(CONTACT)).isEqualTo(saved);
			} finally { chaos(Map.of()); }
			body(a.command("POST", CONTACT, Map.of("email", rejected)), 200);
			assertThat(a.read(CONTACT).path("verifiedAt").isNull()).isTrue();
		}
	}
	@Test void malformedInputsCannotWriteOrEchoCredentials() throws Exception {
		try (var a = browser(familyAName)) {
			for (String email : new String[] {"", "not-email", "a".repeat(255) + "@example.test", "x@example.test\r\nBcc:other@example.test"})
				body(a.command("POST", CONTACT, Map.of("email", email)), 400);
			body(a.command("POST", CONTACT, null), 400);
			var failed = body(a.command("POST", CONTACT + "/verify", Map.of("token", "sensitive-not-a-code")), 400);
			assertThat(failed.toString()).doesNotContain("sensitive-not-a-code");
			assertThat(a.read(CONTACT).path("email").isNull()).isTrue();
		}
	}
	@Test void authorizationIsRecheckedAfterLoginForEveryOperation() throws Exception {
		try (var a = browser(familyAName); var manager = browser(managerName); var anonymous = new Browser()) {
			assertThat(anonymous.get(CONTACT).statusCode()).isEqualTo(401);
			assertThat(manager.get(CONTACT).statusCode()).isEqualTo(403);
			String email = address(); body(a.command("POST", CONTACT, Map.of("email", email)), 200);
			String code = token(mailFor(email));
			jdbc.update("DELETE FROM user_role WHERE user_id=? AND role='FAMILY'", familyAUser);
			assertThat(a.get(CONTACT).statusCode()).isEqualTo(403);
			body(a.command("POST", CONTACT, Map.of("email", address())), 403);
			body(a.command("POST", CONTACT + "/verify", Map.of("token", code)), 403);
			body(a.command("DELETE", CONTACT, null), 403);
		}
	}
	@Test void disabledAccountAndMissingCsrfCannotChangeContact() throws Exception {
		try (var a = browser(familyAName)) {
			var raw = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + CONTACT)).header("Content-Type", "application/json")
					.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("email", address())))).build();
			assertThat(a.client.send(raw, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(403);
			jdbc.update("UPDATE app_user SET enabled=false WHERE id=?", familyAUser);
			assertThat(a.get(CONTACT).statusCode()).isEqualTo(403);
			body(a.command("DELETE", CONTACT, null), 403);
		}
	}
	@Test void firstConcurrentRequestsSendOnlyOneVerificationMail() throws Exception {
		String first = address(), second = address(); var start = new CountDownLatch(1);
		try (var a = browser(familyAName); var b = browser(familyAName)) {
			var x = CompletableFuture.supplyAsync(() -> racingRequest(a, first, start));
			var y = CompletableFuture.supplyAsync(() -> racingRequest(b, second, start)); start.countDown();
			assertThat(java.util.List.of(x.get().statusCode(), y.get().statusCode())).containsExactlyInAnyOrder(200, 409);
			var current = a.read(CONTACT);
			String email = current.path("email").asString();
			body(a.command("POST", CONTACT + "/verify", Map.of("token", token(mailFor(email)))), 200);
		}
	}
	@Test void databaseFailureBeforeSendingKeepsTheSavedAddress() throws Exception {
		String first = address();
		try (var a = browser(familyAName)) {
			body(a.command("POST", CONTACT, Map.of("email", first)), 200);
			var saved = body(a.command("POST", CONTACT + "/verify", Map.of("token", token(mailFor(first)))), 200);
			clock.time = START.plusSeconds(60);
			jdbc.execute("CREATE TRIGGER fm05_email_test_fail BEFORE UPDATE ON family_notification_email FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic email write failure'");
			try {
				var failed = body(a.command("POST", CONTACT, Map.of("email", address())), 500);
				assertThat(failed.toString()).doesNotContain("Synthetic", first);
				assertThat(a.read(CONTACT)).isEqualTo(saved);
			} finally { jdbc.execute("DROP TRIGGER fm05_email_test_fail"); }
		}
	}
	private HttpResponse<String> racingRequest(Browser browser, String email, CountDownLatch start) {
		try { start.await(); return browser.command("POST", CONTACT, Map.of("email", email)); }
		catch (Exception failure) { throw new IllegalStateException(failure); }
	}
	private String address() { return "family-" + UUID.randomUUID() + "@example.test"; }
	private void chaos(Map<String, ?> settings) throws Exception {
		try (var client = HttpClient.newHttpClient()) {
			body(client.send(HttpRequest.newBuilder(URI.create("http://" + MAIL.getHost() + ":" + MAIL.getMappedPort(8025) + "/api/v1/chaos"))
					.header("Content-Type", "application/json").PUT(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(settings))).build(), HttpResponse.BodyHandlers.ofString()), 200);
		}
	}

	private JsonNode mailFor(String email) throws Exception {
		var messages = mailGet("/api/v1/messages").path("messages");
		for (var row : messages) {
			if (row.path("To").valueStream().anyMatch(to -> to.path("Address").asString().equals(email)))
				return mailGet("/api/v1/message/" + row.path("ID").asString());
		}
		throw new AssertionError("SMTP must deliver a verification message to the requested fictional address");
	}
	private String token(JsonNode message) {
		var matcher = Pattern.compile("Verification code: ([a-f0-9]{64})").matcher(message.path("Text").asString());
		assertThat(matcher.find()).isTrue(); return matcher.group(1);
	}
	private JsonNode mailGet(String path) throws Exception {
		try (var client = HttpClient.newHttpClient()) {
			return body(client.send(HttpRequest.newBuilder(URI.create("http://" + MAIL.getHost() + ":" + MAIL.getMappedPort(8025) + path))
					.timeout(Duration.ofSeconds(10)).GET().build(), HttpResponse.BodyHandlers.ofString()), 200);
		}
	}
	private long relative(long user) {
		return insert("INSERT INTO family_member(user_id,full_name) VALUES (?, 'Fictional family')", user);
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
