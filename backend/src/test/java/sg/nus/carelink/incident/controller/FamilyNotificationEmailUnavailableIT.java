package sg.nus.carelink.incident.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
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

/** Default deployments still start without SMTP and cannot claim an email was sent.
 * @author Wang Zhili
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"carelink.report.schedule-cron=-", "carelink.roster.schedule-cron=-", "carelink.caregiver.expiry-scan-cron=-",
		"carelink.rerostering.scan-initial-delay=PT1H", "carelink.escalation.scan-initial-delay=PT1H",
		"carelink.roster.uncovered-scan-initial-delay=PT1H", "carelink.roster.leave-reminder-initial-delay=PT1H"
})
class FamilyNotificationEmailUnavailableIT {
	private static final String CONTACT = "/api/family/notification-email";
	@LocalServerPort private int port;
	@Autowired private JdbcTemplate jdbc;
	private final JsonMapper json = JsonMapper.builder().build();
	@DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
		SharedMySql.register(registry, FamilyNotificationEmailUnavailableIT.class, null);
	}
	@Test void unavailableSmtpCannotActivateOrChangeAnAddressButRemovalIsStillAvailable() throws Exception {
		String username = "email-unavailable-" + UUID.randomUUID();
		long userId = account(username, "FAMILY");
		jdbc.update("INSERT INTO family_member(user_id,full_name) VALUES (?, 'Fictional family')", userId);
		try (var family = browser(username)) {
			var empty = family.read(CONTACT);
			assertThat(empty.path("configured").asBoolean()).isFalse();
			body(family.command("POST", CONTACT, Map.of("email", "family@example.test")), 503);
			assertThat(family.read(CONTACT)).isEqualTo(empty);
			body(family.command("POST", CONTACT + "/verify", Map.of("token", "a".repeat(64))), 409);
			assertThat(body(family.command("DELETE", CONTACT, null), 200)).isEqualTo(empty);
		}
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
