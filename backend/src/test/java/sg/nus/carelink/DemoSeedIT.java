package sg.nus.carelink;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

/**
 * Checks that the demonstration seed still loads and still describes a system worth
 * demonstrating.
 *
 * <p>{@code db/demo/V900__demo_seed.sql} sits outside {@code db/migration} so that no
 * throwaway test database inherits it - a seeded row once turned another module's
 * {@code DELETE FROM family_member} into a foreign key violation, and moving the file is
 * what fixed it. The cost of that move is that nothing in the pipeline ran the seed any
 * more: it was executed for the first time when staging started, ten minutes into a
 * deployment, and a mistake in it surfaced as "staging did not pick up this commit"
 * rather than as a line number. This test buys that back.
 *
 * <p>It opts in through {@code spring.flyway.locations} for itself alone. The property
 * gives this class its own Spring context, and the container is per class as everywhere
 * else, so the seed reaches this database and no other. That isolation is the whole
 * arrangement - if it is ever weakened, the original failure comes back.
 *
 * <p>The assertions are deliberately structural. They say "at least two managers", not
 * "exactly three", because the seed is demonstration material that anyone may extend; a
 * test that counts rows would turn every addition into a build failure. What is asserted
 * is what the demonstrations actually depend on, and nothing beyond it.
 *
 * <p>Named *IT: runs under the integration-tests job of the pipeline; needs Docker.
 */
@SpringBootTest(properties = "spring.flyway.locations=classpath:db/migration,classpath:db/demo")
@Testcontainers
class DemoSeedIT {

	@Container
	@ServiceConnection
	static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4");

	@Autowired
	private JdbcTemplate jdbc;

	/**
	 * The plain fact that the context is up means Flyway ran every statement in the seed
	 * against the real schema and Hibernate then validated its mappings. That is most of
	 * the value here: a column the seed no longer matches, a value an enum no longer
	 * accepts, or a foreign key pointing at a row somebody removed all fail before this
	 * assertion is reached.
	 */
	@Test
	void theSeedLoadsAgainstTheCurrentSchema() {
		assertThat(count("app_user")).isPositive();
		assertThat(count("elder")).isPositive();
	}

	/**
	 * UC-MG05's chain hands an unanswered incident to the next manager, so a demonstration
	 * needs somebody to hand it to. With one manager the chain has nowhere to go and the
	 * escalation can only ever be shown failing.
	 */
	@Test
	void thereAreEnoughManagersForAnEscalationToHaveSomewhereToGo() {
		List<Long> managers = jdbc.queryForList(
				"select u.id from app_user u join user_role r on r.user_id = u.id "
						+ "where u.enabled = true and r.role = 'MANAGER'",
				Long.class);

		assertThat(managers).hasSizeGreaterThanOrEqualTo(2);
	}

	/**
	 * The last step of the chain tells the family, and it finds them with this join. A
	 * binding that expired, or a family member without an account, would leave the final
	 * escalation notifying nobody - visible in a demonstration only as silence.
	 *
	 * <p>Written as the same shape of query the notifier uses, on purpose: asserting that
	 * the rows exist is weaker than asserting that the real lookup returns them.
	 */
	@Test
	void anElderIsReachableThroughFamilyTheWayTheNotifierLooksThemUp() {
		List<Long> recipients = jdbc.queryForList(
				"select f.user_id from elder_family_binding b "
						+ "join family_member f on f.id = b.family_member_id "
						+ "where b.status = 'ACTIVE' "
						+ "  and (b.expires_at is null or b.expires_at > now()) "
						+ "  and f.user_id is not null",
				Long.class);

		assertThat(recipients).isNotEmpty();
	}

	/**
	 * The continuity tier of the chain prefers a manager who has handled this elder before,
	 * which it reads from closed incidents. Without history the tier finds nothing and every
	 * demonstration falls through to the same generic fallback.
	 */
	@Test
	void aClosedIncidentGivesTheContinuityTierSomeHistoryToFind() {
		Long withResponder = jdbc.queryForObject(
				"select count(*) from incident where status = 'RESOLVED' and responder_user_id is not null",
				Long.class);

		assertThat(withResponder).isPositive();
	}

	/**
	 * A resolved incident whose timeline is empty would show the manager's screen working
	 * and say nothing about what the screen is for.
	 */
	@Test
	void theClosedIncidentCarriesItsTimeline() {
		Long entries = jdbc.queryForObject(
				"select count(*) from incident_log l join incident i on i.id = l.incident_id "
						+ "where i.status = 'RESOLVED'",
				Long.class);

		assertThat(entries).isGreaterThanOrEqualTo(2L);
	}

	/**
	 * These accounts share one password and the file says so in the open. What must not
	 * happen is the password being stored as itself: a seed is copied and adapted, and a
	 * plain text credential in it would outlive the proof of concept.
	 */
	@Test
	void everyDemonstrationAccountStoresAHashedPassword() {
		List<String> hashes = jdbc.queryForList("select password_hash from app_user", String.class);

		assertThat(hashes).isNotEmpty().allSatisfy(hash ->
				assertThat(hash).startsWith("{bcrypt}$"));
	}

	private Long count(String table) {
		return jdbc.queryForObject("select count(*) from " + table, Long.class);
	}
}
