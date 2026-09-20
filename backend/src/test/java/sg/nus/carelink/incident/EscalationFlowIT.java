package sg.nus.carelink.incident;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
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

	private static final Long ALICE = 1L;
	private static final Long BEN = 2L;

	/**
	 * Every test gets its own elder.
	 *
	 * <p>Not fussiness: the continuity tier of the chain reads the elder's incident history,
	 * so two tests sharing an elder would have the second one routed by what the first one
	 * left behind. Sharing a database is fine; sharing a subject is not.
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
	void givenAFreshElderAndAFixedClock() {
		clock.set(Instant.parse("2026-09-16T06:30:00Z"));
		jdbc.update("insert into elder (full_name, lives_alone) values (?, ?)", "Test Elder", true);
		elder = jdbc.queryForObject("select last_insert_id()", Long.class);
	}

	/** Gives this test's elder a closed incident that a named manager handled. */
	private void givenTheElderWasHandledBefore(Long responderUserId) {
		jdbc.update("""
				insert into incident (elder_id, reported_by_user_id, responder_user_id, source,
				                      category, severity, status, description, reported_at, resolved_at)
				values (?, 4, ?, 'CAREGIVER', 'FALL', 'MEDIUM', 'RESOLVED', 'an earlier call-out',
				        '2026-09-09 10:15:00', '2026-09-09 11:02:00')
				""", elder, responderUserId);
	}

	@Test
	void anElderWithAHistoryGetsTheManagerWhoAlreadyKnowsThem() {
		givenTheElderWasHandledBefore(BEN);

		Incident raised = incidents.createElderEmergency(
				elder, 6L, null, null, "Blk 123 #04-56", "fell in the bathroom");

		assertThat(raised.id()).isNotNull();
		assertThat(raised.responderUserId())
				.as("Ben handled this elder's fall last week, so the continuity tier picks him")
				.isEqualTo(BEN);
		assertThat(raised.respondBy())
				.as("a HIGH severity SOS gives the first responder five minutes, on the same clock")
				.isEqualTo(raised.reportedAt().plusMinutes(5));
	}

	@Test
	void anElderWithNoHistoryStillGetsSomebody() {
		Incident raised = incidents.createElderEmergency(elder, null, null, null, null, "no answer at door");

		assertThat(raised.responderUserId()).isNotNull();
		assertThat(raised.status()).isEqualTo(Incident.Status.OPEN);

		EscalationChain chain = incidents.escalationChainOf(raised.id());
		assertThat(chain.assembledFrom()).contains("3 manager(s) enabled");
		assertThat(chain.levels()).extracting(level -> level.tier())
				.contains(EscalationTier.ANY_MANAGER, EscalationTier.FAMILY_ESCALATION);
	}

	@Test
	void theWholeHandlingFlowSurvivesARealDatabase() {
		Incident raised = incidents.createElderEmergency(elder, 6L, null, null, null, "SOS pressed");
		Long id = raised.id();

		incidents.claim(id, BEN, "Ben Lim (ben)");
		incidents.recordContactAttempt(
				id,
				new ContactAttempt(ContactAttempt.Channel.PHONE, ContactAttempt.Outcome.NOT_REACHED, "no answer"),
				"Ben Lim (ben)");
		incidents.applyPlaybook(id, Playbook.SOS_IMMEDIATE.code(), "Ben Lim (ben)");
		Incident resolved = incidents.resolve(
				id, BEN, "Ambulance called, daughter informed.", "REFERRED_TO_MEDICAL_CARE", "Ben Lim (ben)");

		assertThat(resolved.status()).isEqualTo(Incident.Status.RESOLVED);
		assertThat(resolved.resolvedAt()).isNotNull();

		List<String> timeline = incidents.timelineOf(id).stream().map(IncidentLog::action).toList();
		assertThat(timeline).containsExactly(
				"REPORTED", "ASSIGNED", "CLAIMED", "CONTACT_ATTEMPTED", "PLAYBOOK_APPLIED", "RESOLVED");
	}

	@Test
	void anExpiredCountdownIsEscalatedByTheSweepAndEveryStepIsOnTheTimeline() {
		givenTheElderWasHandledBefore(BEN);
		Incident raised = incidents.createElderEmergency(elder, 6L, null, null, null, "SOS pressed");
		Long id = raised.id();
		assertThat(raised.responderUserId()).isEqualTo(BEN);

		clock.advance(Duration.ofMinutes(6));
		int escalated = scan.sweep();

		assertThat(escalated).isEqualTo(1);
		Incident after = repository.findById(id).orElseThrow();
		assertThat(after.responderUserId())
				.as("the responder who let the countdown expire does not get it back")
				.isNotEqualTo(BEN);
		assertThat(after.respondBy()).isAfter(raised.respondBy());

		assertThat(incidents.timelineOf(id).stream().map(IncidentLog::action))
				.containsSubsequence("ASSIGNED", "ESCALATED", "ASSIGNED");
	}

	@Test
	void anIncidentNobodyTakesEndsUpPinnedForTheFamilyRatherThanClosed() {
		Incident raised = incidents.createElderEmergency(elder, 6L, null, null, null, "SOS pressed");
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
		Incident raised = incidents.createElderEmergency(elder, 6L, null, null, null, "SOS pressed");
		Long id = raised.id();

		clock.advance(Duration.ofMinutes(6));
		incidents.claim(id, ALICE, "Alice Tan (alice)");
		int escalated = scan.sweep();

		assertThat(escalated).isZero();
		Incident after = repository.findById(id).orElseThrow();
		assertThat(after.status()).isEqualTo(Incident.Status.IN_PROGRESS);
		assertThat(after.responderUserId()).isEqualTo(ALICE);
	}

	@Test
	void raisingTheSeverityRebuildsTheChainWithoutOpeningASecondIncident() {
		Incident raised = incidents.createElderEmergency(elder, 6L, null, null, null, "SOS pressed");
		Long id = raised.id();

		Incident changed = incidents.changeSeverity(id, Incident.Severity.LOW, "elder is calm now", "Ben Lim (ben)");

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
