package sg.nus.carelink.incident;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import sg.nus.carelink.incident.application.EscalationScanService;
import sg.nus.carelink.incident.application.IncidentService;
import sg.nus.carelink.incident.domain.model.ContactAttempt;
import sg.nus.carelink.incident.domain.model.EscalationChain;
import sg.nus.carelink.incident.domain.model.EscalationLevel;
import sg.nus.carelink.incident.domain.model.EscalationTier;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.model.IncidentLog;
import sg.nus.carelink.incident.domain.model.Playbook;
import sg.nus.carelink.incident.domain.repository.IncidentRepository;

/**
 * UC-MG05 and UC-SYS02 against a real MySQL, with the real Flyway migrations, the real
 * Spring wiring and the real transaction boundaries.
 *
 * <p>The unit tests prove the rules; this proves the parts fit together. It is where the
 * things a fake cannot catch show up: a column that will not take the value the domain
 * produces, a query that does not match the index it was written for, a {@code REQUIRES_NEW}
 * that never reaches the proxy.
 *
 * <p>Every row it needs, it creates. The database it starts from is the bare schema -
 * demonstration data lives in {@code db/demo} and is loaded by hand on staging, never by
 * the application - so nothing here depends on rows somebody else might edit, and nothing
 * here is in the way of another test clearing a table.
 *
 * <p>Time is the one thing that stays fake. The clock bean is replaced with one the test
 * moves by hand, so a five-minute countdown can be stepped over without the test taking five
 * minutes. {@code EscalationConfig} only supplies its own clock when nothing else does,
 * which is what makes the substitution possible.
 *
 * <p>Named *IT: runs under the integration-tests job of the pipeline; needs Docker.
 */
@SpringBootTest
@Testcontainers
@Import(EscalationFlowIT.FixedClockConfig.class)
@TestPropertySource(properties = {
		// Keep the real scheduler out of the way; the sweep is driven by hand here.
		"carelink.escalation.scan-initial-delay=PT1H"
})
class EscalationFlowIT {

	@Container
	@ServiceConnection
	static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4");

	/**
	 * The institution's managers, created once for the class.
	 *
	 * <p>The chain is assembled from everyone available, so the number of managers is an
	 * input to the rules. Creating them per test would make every assertion about chain
	 * length a moving target. The elder is per test; the institution is not.
	 */
	private static Long alice;
	private static Long ben;
	private static boolean institutionReady;

	/**
	 * A fresh elder for every test.
	 *
	 * <p>The continuity tier reads the elder's incident history, so two tests sharing an
	 * elder would have the second one routed by what the first one left behind. Sharing a
	 * database is fine; sharing a subject is not.
	 */
	private Long elder;

	@Autowired
	private IncidentService incidents;

	@Autowired
	private EscalationScanService scan;

	@Autowired
	private IncidentRepository repository;

	@Autowired
	private MovableClock clock;

	@Autowired
	private JdbcTemplate jdbc;

	@BeforeEach
	void givenAnInstitutionAFreshElderAndAFixedClock() {
		clock.set(Instant.parse("2026-09-16T06:30:00Z"));

		if (!institutionReady) {
			alice = createManager("it-alice", "Alice Tan");
			ben = createManager("it-ben", "Ben Lim");
			createManager("it-cara", "Cara Ong");
			institutionReady = true;
		}

		jdbc.update("insert into elder (full_name, lives_alone) values (?, ?)", "Test Elder", true);
		elder = jdbc.queryForObject("select last_insert_id()", Long.class);
	}

	private Long createManager(String username, String displayName) {
		jdbc.update(
				"insert into app_user (username, password_hash, display_name, enabled)"
						+ " values (?, '{noop}unused-here', ?, true)",
				username, displayName);
		Long id = jdbc.queryForObject("select last_insert_id()", Long.class);
		jdbc.update("insert into user_role (user_id, role) values (?, 'MANAGER')", id);
		return id;
	}

	/** Gives this test's elder a closed incident that a named manager handled. */
	private void givenTheElderWasHandledBefore(Long responderUserId) {
		jdbc.update(
				"insert into incident (elder_id, responder_user_id, source, category, severity,"
						+ " status, description, reported_at, resolved_at)"
						+ " values (?, ?, 'CAREGIVER', 'FALL', 'MEDIUM', 'RESOLVED',"
						+ " 'an earlier call-out', '2026-09-09 10:15:00', '2026-09-09 11:02:00')",
				elder, responderUserId);
	}

	/**
	 * Raises an incident through the manager module's own entry point.
	 *
	 * <p>Not the elder SOS one: that belongs to the elder module and does not route through
	 * the chain yet, which is raised on the pull request rather than changed here.
	 */
	private Incident raiseFor(Long elderId, String what) {
		return incidents.reportByCaregiver(
				elderId, null, null, Incident.Category.SOS, Incident.Severity.HIGH, what);
	}

	/**
	 * Binds a family member to this test's elder, with an expiry.
	 *
	 * @return the family member's account id, which is who a notification would name
	 */
	private Long givenAFamilyMemberBoundUntil(String username, LocalDateTime expiresAt) {
		jdbc.update(
				"insert into app_user (username, password_hash, display_name, enabled)"
						+ " values (?, '{noop}unused-here', 'Family Member', true)",
				username);
		Long userId = jdbc.queryForObject("select last_insert_id()", Long.class);
		jdbc.update("insert into user_role (user_id, role) values (?, 'FAMILY')", userId);

		jdbc.update("insert into family_member (user_id, full_name) values (?, 'Family Member')", userId);
		Long familyMemberId = jdbc.queryForObject("select last_insert_id()", Long.class);

		jdbc.update(
				"insert into elder_family_binding (elder_id, family_member_id, relationship,"
						+ " access_scope, status, confirmed_at, expires_at)"
						+ " values (?, ?, 'DAUGHTER', 'FULL', 'ACTIVE', ?, ?)",
				elder, familyMemberId, LocalDateTime.now(clock).minusDays(30), expiresAt);
		return userId;
	}

	/**
	 * Closes an incident this test raised only to see who was told about it.
	 *
	 * <p>The sweep is institution-wide, not elder-wide, so an incident left open on a fixed
	 * clock is picked up by whichever test advances that clock next and counts what it
	 * escalated. Giving each test its own elder is not enough to keep them apart; a test
	 * that opens an incident has to close it.
	 */
	private void closeSoTheSweepDoesNotFindIt(Incident raised) {
		incidents.resolve(raised.id(), raised.responderUserId(),
				"raised only to check who was notified", "HANDLED_ON_SITE", "test");
	}

	private long alertsAddressedTo(Long userId, Long incidentId) {
		Long rows = jdbc.queryForObject(
				"select count(*) from notification where recipient_user_id = ?"
						+ " and resource_type = 'INCIDENT' and resource_id = ?",
				Long.class, userId, incidentId);
		return rows == null ? 0L : rows;
	}

	// ------------------------------------------------------- who hears about it ---

	/**
	 * The binding has not run out on the clock this system runs on, so the family is told.
	 *
	 * <p>Worth a test of its own because the expiry used to be compared against the
	 * database's own {@code now()}. The two clocks agree in ordinary use and the question
	 * only becomes visible when they are made to disagree, which is exactly what this fixed
	 * clock does: the binding here has expired by the wall clock of the machine running the
	 * test, and has not expired by the clock the application is using.
	 */
	@Test
	void afamilyMemberWhoseBindingIsStillWithinItsTermIsTold() {
		Long family = givenAFamilyMemberBoundUntil(
				"it-family-current", LocalDateTime.now(clock).plusDays(2));

		Incident raised = raiseFor(elder, "no answer at door");

		assertThat(alertsAddressedTo(family, raised.id()))
				.as("the binding runs for another two days on the application's clock")
				.isPositive();

		closeSoTheSweepDoesNotFindIt(raised);
	}

	/** An expired delegation stops reaching the family; that is what the expiry is for. */
	@Test
	void afamilyMemberWhoseBindingHasRunOutIsNot() {
		Long family = givenAFamilyMemberBoundUntil(
				"it-family-expired", LocalDateTime.now(clock).minusDays(1));

		Incident raised = raiseFor(elder, "no answer at door");

		assertThat(alertsAddressedTo(family, raised.id())).isZero();

		closeSoTheSweepDoesNotFindIt(raised);
	}

	// ----------------------------------------------------------------- routing ---

	@Test
	void anElderWithAHistoryGetsTheManagerWhoAlreadyKnowsThem() {
		givenTheElderWasHandledBefore(ben);

		Incident raised = raiseFor(elder, "fell in the bathroom");

		assertThat(raised.id()).isNotNull();
		assertThat(raised.responderUserId())
				.as("Ben handled this elder's fall last week, so the continuity tier picks him")
				.isEqualTo(ben);
		assertThat(raised.respondBy())
				.as("a HIGH severity incident gives the first responder five minutes, on the same clock")
				.isEqualTo(raised.reportedAt().plusMinutes(5));
	}

	@Test
	void anElderWithNoHistoryStillGetsSomebody() {
		Incident raised = raiseFor(elder, "no answer at door");

		assertThat(raised.responderUserId()).isNotNull();
		assertThat(raised.status()).isEqualTo(Incident.Status.OPEN);

		EscalationChain chain = incidents.escalationChainOf(raised.id());
		assertThat(chain.assembledFrom()).contains("3 manager(s) enabled");
		assertThat(chain.levels()).extracting(EscalationLevel::tier)
				.contains(EscalationTier.ANY_MANAGER, EscalationTier.FAMILY_ESCALATION);
	}

	// --------------------------------------------------------- telling people ---

	@Test
	void everyoneWhoCouldActGetsARowInTheInboxAtOnce() {
		Incident raised = raiseFor(elder, "SOS pressed");

		List<String> told = jdbc.queryForList(
				"select u.username from notification n"
						+ " join app_user u on u.id = n.recipient_user_id"
						+ " where n.resource_type = 'INCIDENT' and n.resource_id = ?"
						+ "   and n.event_type = 'INCIDENT_RAISED'"
						+ " order by u.username",
				String.class, raised.id());

		assertThat(told)
				.as("all three managers, in the same second the incident was raised")
				.contains("it-alice", "it-ben", "it-cara");

		assertThat(incidents.timelineOf(raised.id()).stream().map(IncidentLog::action))
				.containsSubsequence("BROADCAST", "ASSIGNED");
	}

	@Test
	void anEscalationDoesNotTellEverybodyAgain() {
		Incident raised = raiseFor(elder, "SOS pressed");
		clock.advance(Duration.ofMinutes(6));
		scan.sweep();

		Integer broadcasts = jdbc.queryForObject(
				"select count(*) from notification where resource_id = ? and event_type = 'INCIDENT_RAISED'",
				Integer.class, raised.id());
		Integer handOvers = jdbc.queryForObject(
				"select count(*) from notification where resource_id = ? and event_type = 'INCIDENT_ASSIGNED'",
				Integer.class, raised.id());

		assertThat(broadcasts).as("the broadcast happened once, when it was raised").isEqualTo(3);
		assertThat(handOvers).as("each new responder is told the incident is theirs").isEqualTo(2);
	}

	// -------------------------------------------------------------- handling ---

	@Test
	void theWholeHandlingFlowSurvivesARealDatabase() {
		Incident raised = raiseFor(elder, "SOS pressed");
		Long id = raised.id();

		incidents.claim(id, ben, "Ben Lim (it-ben)");
		incidents.recordContactAttempt(
				id,
				new ContactAttempt(ContactAttempt.Channel.PHONE, ContactAttempt.Outcome.NOT_REACHED, "no answer"),
				"Ben Lim (it-ben)");
		incidents.applyPlaybook(id, Playbook.SOS_IMMEDIATE.code(), "Ben Lim (it-ben)");
		Incident resolved = incidents.resolve(
				id, ben, "Ambulance called, daughter informed.", "REFERRED_TO_MEDICAL_CARE", "Ben Lim (it-ben)");

		assertThat(resolved.status()).isEqualTo(Incident.Status.RESOLVED);
		assertThat(resolved.resolvedAt()).isNotNull();

		List<String> timeline = incidents.timelineOf(id).stream().map(IncidentLog::action).toList();
		assertThat(timeline).containsExactly(
				"REPORTED", "BROADCAST", "ASSIGNED", "CLAIMED",
				"CONTACT_ATTEMPTED", "PLAYBOOK_APPLIED", "RESOLVED");
	}

	// ------------------------------------------------------------ escalating ---

	@Test
	void anExpiredCountdownIsEscalatedByTheSweepAndEveryStepIsOnTheTimeline() {
		givenTheElderWasHandledBefore(ben);
		Incident raised = raiseFor(elder, "SOS pressed");
		Long id = raised.id();
		assertThat(raised.responderUserId()).isEqualTo(ben);

		clock.advance(Duration.ofMinutes(6));
		int escalated = scan.sweep();

		assertThat(escalated).isEqualTo(1);
		Incident after = repository.findById(id).orElseThrow();
		assertThat(after.responderUserId())
				.as("the responder who let the countdown expire does not get it back")
				.isNotEqualTo(ben);
		assertThat(after.respondBy()).isAfter(raised.respondBy());

		assertThat(incidents.timelineOf(id).stream().map(IncidentLog::action))
				.containsSubsequence("ASSIGNED", "ESCALATED", "ASSIGNED");
	}

	@Test
	void anIncidentNobodyTakesEndsUpPinnedForTheFamilyRatherThanClosed() {
		Incident raised = raiseFor(elder, "SOS pressed");
		Long id = raised.id();

		// Every manager in turn lets their countdown expire.
		for (int round = 0; round < 4; round++) {
			clock.advance(Duration.ofHours(1));
			scan.sweep();
		}

		Incident after = repository.findById(id).orElseThrow();
		assertThat(after.status()).isEqualTo(Incident.Status.UNRESOLVED_ESCALATED);
		assertThat(after.resolvedAt())
				.as("an incident nobody handled is never closed automatically")
				.isNull();
		assertThat(incidents.timelineOf(id).stream().map(IncidentLog::action))
				.contains("CHAIN_EXHAUSTED");
	}

	@Test
	void takingOverBeforeTheSweepKeepsTheIncidentWhereItIs() {
		Incident raised = raiseFor(elder, "SOS pressed");
		Long id = raised.id();

		clock.advance(Duration.ofMinutes(6));
		incidents.claim(id, alice, "Alice Tan (it-alice)");
		int escalated = scan.sweep();

		assertThat(escalated).isZero();
		Incident after = repository.findById(id).orElseThrow();
		assertThat(after.status()).isEqualTo(Incident.Status.IN_PROGRESS);
		assertThat(after.responderUserId()).isEqualTo(alice);
	}

	@Test
	void raisingTheSeverityRebuildsTheChainWithoutOpeningASecondIncident() {
		Incident raised = raiseFor(elder, "SOS pressed");
		Long id = raised.id();

		Incident changed = incidents.changeSeverity(
				id, Incident.Severity.LOW, "elder is calm now", "Ben Lim (it-ben)");

		assertThat(changed.id()).isEqualTo(id);
		assertThat(changed.severity()).isEqualTo(Incident.Severity.LOW);
		assertThat(incidents.forElder(elder))
				.as("no second incident was opened for the same event")
				.hasSize(1);
		assertThat(incidents.timelineOf(id).stream().map(IncidentLog::action))
				.contains("SEVERITY_CHANGED");
	}

	// ----------------------------------------------------------------- the clock ---

	@TestConfiguration
	static class FixedClockConfig {

		@Bean
		MovableClock movableClock() {
			return new MovableClock(Instant.parse("2026-09-16T06:30:00Z"), ZoneId.of("Asia/Singapore"));
		}

		@Bean
		Clock clock(MovableClock movable) {
			return movable;
		}
	}

	/** A clock the test winds forward, so a countdown can expire without anybody waiting. */
	static final class MovableClock extends Clock {

		private Instant now;
		private final ZoneId zone;

		MovableClock(Instant start, ZoneId zone) {
			this.now = start;
			this.zone = zone;
		}

		void set(Instant moment) {
			this.now = moment;
		}

		void advance(Duration by) {
			this.now = this.now.plus(by);
		}

		@Override
		public ZoneId getZone() {
			return zone;
		}

		@Override
		public Clock withZone(ZoneId otherZone) {
			return new MovableClock(now, otherZone);
		}

		@Override
		public Instant instant() {
			return now;
		}
	}
}
