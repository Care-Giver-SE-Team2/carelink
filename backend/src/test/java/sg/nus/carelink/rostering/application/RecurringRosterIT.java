package sg.nus.carelink.rostering.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import sg.nus.carelink.careplan.application.CarePlanService;
import sg.nus.carelink.careplan.application.PlanNodeInput;
import sg.nus.carelink.careplan.application.VisitInput;
import sg.nus.carelink.careplan.domain.model.CarePlan;
import sg.nus.carelink.careplan.domain.model.CarePlanNode;
import sg.nus.carelink.profile.application.PrimaryCaregiverService;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.testsupport.SharedMySql;

/**
 * UC-MG03 end to end on real MySQL: publishing a plan fills the elder's next two weeks with
 * visits once the publish commits, naming a primary caregiver covers them, republishing keeps
 * the visits it leaves unchanged, and stopping the plan calls off the ones from the stop date.
 */
@SpringBootTest
class RecurringRosterIT {

	@DynamicPropertySource
	static void database(DynamicPropertyRegistry registry) {
		SharedMySql.register(registry, RecurringRosterIT.class, null);
	}

	@Autowired
	private CarePlanService carePlans;
	@Autowired
	private PrimaryCaregiverService primaryCaregivers;
	@Autowired
	private RecurringRosterService roster;
	@Autowired
	private UncoveredVisitService uncovered;
	@Autowired
	private Clock clock;
	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void publishingNamingACaregiverAndStoppingKeepTheVisitsInStep() {
		Long elderId = elder();
		LocalDate tomorrow = LocalDate.now(clock).plusDays(1);
		CarePlan draft = carePlans.createDraft(elderId, null);

		carePlans.publish(draft.id(), tomorrow, List.of(new PlanNodeInput("Personal care", "BATHING", "Bathing assistance",
				Arrays.stream(DayOfWeek.values()).map(day -> new VisitInput(day.name(), LocalTime.of(8, 0), 30)).toList(),
				CarePlanNode.EvidenceType.CHECKLIST)));

		// Tomorrow through the last day of the 14-day window, one visit a day, nobody named yet.
		assertThat(count(elderId, "status = 'SCHEDULED' AND caregiver_id IS NULL")).isEqualTo(13);
		assertThat(count(elderId, "care_plan_id = " + draft.id() + " AND care_plan_node_id IS NOT NULL")).isEqualTo(13);

		Long caregiverId = caregiver();
		primaryCaregivers.assign(elderId, caregiverId);

		assertThat(count(elderId, "status = 'SCHEDULED' AND caregiver_id = " + caregiverId)).isEqualTo(13);

		carePlans.stop(draft.id(), tomorrow.plusDays(6), "Moving in with family", null);

		assertThat(count(elderId, "status = 'SCHEDULED'")).isEqualTo(6);
		assertThat(count(elderId, "status = 'CANCELLED'")).isEqualTo(7);

		assertThat(roster.refreshElder(elderId)).isEqualTo(new RecurringRosterService.RosterRefresh(elderId, 0, 0, 0, 0, 0));
	}

	@Test
	void republishingWithAnExtraTaskKeepsTheUnchangedVisitsInsteadOfCancellingThem() {
		Long elderId = elder();
		Long caregiverId = caregiver();
		primaryCaregivers.assign(elderId, caregiverId);
		CarePlan first = publishDaily(elderId);
		List<Long> before = jdbc.queryForList("SELECT id FROM visit WHERE elder_id = ? ORDER BY id", Long.class, elderId);
		LocalDate from = LocalDate.now(clock).plusDays(3);
		CarePlan draft = carePlans.createDraft(elderId, null);

		List<PlanNodeInput> withLunch = new java.util.ArrayList<>(dailyAt(LocalTime.of(8, 0)));
		withLunch.add(new PlanNodeInput("Meals", null, "Lunch",
				Arrays.stream(DayOfWeek.values()).map(day -> new VisitInput(day.name(), LocalTime.of(12, 0), 30)).toList(),
				CarePlanNode.EvidenceType.CHECKLIST));
		carePlans.publish(draft.id(), from, withLunch);

		assertThat(count(elderId, "status = 'CANCELLED'")).isZero();
		// Tomorrow and the day after stay on the first version; the rest move, keeping their ids and caregiver.
		assertThat(count(elderId, "care_plan_id = " + first.id())).isEqualTo(2);
		assertThat(count(elderId, "care_plan_id = " + draft.id() + " AND service_type = 'Bathing assistance' AND caregiver_id = "
				+ caregiverId)).isEqualTo(11);
		assertThat(jdbc.queryForList("SELECT id FROM visit WHERE elder_id = ? AND service_type = 'Bathing assistance' ORDER BY id",
				Long.class, elderId)).isEqualTo(before);
		assertThat(count(elderId, "care_plan_id = " + draft.id() + " AND service_type = 'Lunch'")).isEqualTo(11);
		assertThat(roster.refreshElder(elderId)).isEqualTo(new RecurringRosterService.RosterRefresh(elderId, 0, 0, 0, 0, 0));
	}

	@Test
	void aVersionStartingEarlierThanTheOneItReplacesDoesNotDoubleBookTheDaysBetween() {
		Long elderId = elder();
		publishDaily(elderId);
		CarePlan later = carePlans.createDraft(elderId, null);
		carePlans.publish(later.id(), LocalDate.now(clock).plusDays(7), dailyAt(LocalTime.of(8, 0)));
		CarePlan sooner = carePlans.createDraft(elderId, null);

		carePlans.publish(sooner.id(), LocalDate.now(clock).plusDays(3), dailyAt(LocalTime.of(8, 0)));

		assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM (SELECT scheduled_start FROM visit WHERE elder_id = ? "
				+ "AND status = 'SCHEDULED' GROUP BY scheduled_start HAVING COUNT(*) > 1) twice", Integer.class, elderId))
				.isZero();
		assertThat(count(elderId, "status = 'SCHEDULED'")).isEqualTo(13);
		assertThat(count(elderId, "care_plan_id = " + sooner.id() + " AND status = 'SCHEDULED'")).isEqualTo(11);
	}

	@Test
	void replacingThePrimaryCaregiverHandsTheirUntouchedVisitsOverAndRemovingThemLeavesVisitsToBeCovered() {
		Long elderId = elder();
		Long first = caregiver();
		Long second = caregiver();
		primaryCaregivers.assign(elderId, first);
		CarePlan plan = publishDaily(elderId);
		assertThat(count(elderId, "caregiver_id = " + first)).isEqualTo(13);
		jdbc.update("INSERT INTO visit (elder_id, caregiver_id, service_type, scheduled_start, scheduled_end, status) VALUES (?, ?, 'Escort to clinic', ?, ?, 'SCHEDULED')",
				elderId, first, LocalDateTime.now(clock).plusDays(2), LocalDateTime.now(clock).plusDays(2).plusHours(1));
		Long extraService = jdbc.queryForObject("SELECT MAX(id) FROM visit", Long.class);

		primaryCaregivers.assign(elderId, second);

		assertThat(count(elderId, "care_plan_id = " + plan.id() + " AND caregiver_id = " + second))
				.isEqualTo(13);
		assertThat(jdbc.queryForObject("SELECT caregiver_id FROM visit WHERE id = ?", Long.class, extraService)).isEqualTo(first);

		primaryCaregivers.unassign(elderId);

		assertThat(count(elderId, "care_plan_id = " + plan.id() + " AND caregiver_id IS NULL"))
				.isEqualTo(13);
	}

	@Test
	void refusesAPrimaryCaregiverWhoseOtherElderIsVisitedAtTheSameTime() {
		Long held = elder();
		Long wanted = elder();
		publishDaily(held);
		publishDaily(wanted);
		Long caregiverId = caregiver();
		primaryCaregivers.assign(held, caregiverId);

		assertThatThrownBy(() -> primaryCaregivers.assign(wanted, caregiverId))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(e -> ((BusinessRuleViolation) e).code()).isEqualTo("CAREGIVER_TIME_CLASH");
		assertThat(count(wanted, "caregiver_id IS NOT NULL")).isZero();
	}

	@Test
	void refusesToPublishAVersionThatClashesWithAnotherElderOfThePrimaryCaregiverAndKeepsNothing() {
		Long held = elder();
		Long elderId = elder();
		publishDaily(held);
		CarePlan current = publishDailyAt(elderId, LocalTime.of(10, 0));
		Long caregiverId = caregiver();
		primaryCaregivers.assign(held, caregiverId);
		primaryCaregivers.assign(elderId, caregiverId);
		CarePlan draft = carePlans.createDraft(elderId, null);

		assertThatThrownBy(() -> carePlans.publish(draft.id(), LocalDate.now(clock).plusDays(3),
				dailyAt(LocalTime.of(8, 0))))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(e -> ((BusinessRuleViolation) e).code()).isEqualTo("CAREGIVER_TIME_CLASH");

		assertThat(carePlans.findCarePlan(draft.id())).get().extracting(CarePlan::status)
				.isEqualTo(CarePlan.Status.DRAFT);
		assertThat(carePlans.findNodes(draft.id())).isEmpty();
		assertThat(carePlans.findCarePlan(current.id())).get().extracting(CarePlan::status)
				.isEqualTo(CarePlan.Status.PUBLISHED);
	}

	@Test
	void aPrimaryCaregiverWhoGoesInactiveHasTheirUntouchedVisitsReleasedOnTheNextRefresh() {
		Long elderId = elder();
		Long caregiverId = caregiver();
		primaryCaregivers.assign(elderId, caregiverId);
		CarePlan plan = publishDaily(elderId);
		assertThat(count(elderId, "caregiver_id = " + caregiverId)).isEqualTo(13);

		// Nothing in the app sets it yet; an admin or a later feature might, however it happens.
		jdbc.update("UPDATE caregiver SET status = 'INACTIVE' WHERE id = ?", caregiverId);

		assertThat(roster.refreshElder(elderId).released()).isEqualTo(13);
		assertThat(count(elderId, "care_plan_id = " + plan.id() + " AND caregiver_id IS NULL"))
				.isEqualTo(13);
		assertThat(roster.refreshElder(elderId).released()).isZero();
	}

	@Test
	void refusesAPrimaryCaregiverWithoutACertificateThePlanRequires() {
		Long elderId = elder();
		CarePlan plan = publishDaily(elderId);
		jdbc.update("INSERT INTO credential_type (name) VALUES (?)", "Roster test certificate " + plan.id());
		Long typeId = jdbc.queryForObject("SELECT MAX(id) FROM credential_type", Long.class);
		jdbc.update("INSERT INTO care_plan_required_credential (care_plan_id, credential_type_id) VALUES (?, ?)",
				plan.id(), typeId);
		Long caregiverId = caregiver();

		assertThatThrownBy(() -> primaryCaregivers.assign(elderId, caregiverId))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(e -> ((BusinessRuleViolation) e).code()).isEqualTo("CAREGIVER_MISSING_CREDENTIAL");
		assertThat(count(elderId, "caregiver_id IS NOT NULL")).isZero();
	}

	@Test
	void aVisitStillUnassignedAtItsStartBecomesAnExceptionWithAnIncident() {
		Long elderId = elder();
		jdbc.update("INSERT INTO visit (elder_id, service_type, scheduled_start, scheduled_end, status) VALUES (?, 'Companionship', ?, ?, 'SCHEDULED')",
				elderId, LocalDateTime.now(clock).minusMinutes(5), LocalDateTime.now(clock).plusMinutes(55));
		Long visitId = jdbc.queryForObject("SELECT MAX(id) FROM visit", Long.class);

		uncovered.startedUncovered().stream()
				.filter(visit -> visit.visitId().equals(visitId))
				.forEach(uncovered::escalate);

		assertThat(count(elderId, "status = 'EXCEPTION'")).isEqualTo(1);
		assertThat(jdbc.queryForObject(
				"SELECT COUNT(*) FROM incident WHERE visit_id = ? AND source = 'SYSTEM_MISSED_CHECKIN'",
				Integer.class, visitId)).isEqualTo(1);
	}

	/** A plan from tomorrow with one 08:00 visit every day: 13 visits in the 14-day window. */
	private CarePlan publishDaily(Long elderId) {
		return publishDailyAt(elderId, LocalTime.of(8, 0));
	}

	private CarePlan publishDailyAt(Long elderId, LocalTime start) {
		CarePlan draft = carePlans.createDraft(elderId, null);
		return carePlans.publish(draft.id(), LocalDate.now(clock).plusDays(1), dailyAt(start));
	}

	private static List<PlanNodeInput> dailyAt(LocalTime start) {
		return List.of(new PlanNodeInput("Personal care", "BATHING", "Bathing assistance",
				Arrays.stream(DayOfWeek.values()).map(day -> new VisitInput(day.name(), start, 30)).toList(),
				CarePlanNode.EvidenceType.CHECKLIST));
	}

	private int count(Long elderId, String condition) {
		return jdbc.queryForObject("SELECT COUNT(*) FROM visit WHERE elder_id = ? AND " + condition,
				Integer.class, elderId);
	}

	private Long elder() {
		jdbc.update("INSERT INTO elder (full_name) VALUES ('Roster test elder')");
		return jdbc.queryForObject("SELECT MAX(id) FROM elder", Long.class);
	}

	private Long caregiver() {
		jdbc.update("INSERT INTO caregiver (user_id, full_name, status) "
				+ "SELECT COALESCE(MAX(user_id), 0) + 1000, 'Roster test caregiver', 'AVAILABLE' FROM caregiver");
		return jdbc.queryForObject("SELECT MAX(id) FROM caregiver", Long.class);
	}
}
