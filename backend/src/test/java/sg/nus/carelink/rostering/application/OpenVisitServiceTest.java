package sg.nus.carelink.rostering.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import sg.nus.carelink.profile.application.CredentialRegister;
import sg.nus.carelink.rostering.domain.model.AbsenceReport;
import sg.nus.carelink.rostering.domain.model.RosteringCandidate;
import sg.nus.carelink.rostering.domain.model.RosteringRun;
import sg.nus.carelink.rostering.domain.service.Shortlist;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.error.ResourceNotFound;
import sg.nus.carelink.visit.application.VisitReassignment.VisitSlot;

/**
 * UC-MG03 on in-memory ports: a hospital escort the family approved is dispatched with nobody on
 * it, and the manager gives it to somebody the rules allow.
 *
 * <p>The roster: visit 40 is Mdm Tan's escort on the 8th at 14:00, no care plan, no end. Aisha (5)
 * is off sick that day, Farah (9) has visited Mdm Tan three times, Siti (10) is booked on Mr Ong
 * at 14:00, Kumar (11) is still onboarding. It is 09:00 on the 7th.
 */
class OpenVisitServiceTest {

	private static final ZoneId ZONE = ZoneId.of("Asia/Singapore");
	private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 7, 9, 0);
	private static final LocalDateTime ESCORT = LocalDateTime.of(2026, 10, 8, 14, 0);
	private static final Long ESCORT_VISIT = 40L;

	private final ReRosteringFakes.MutableClock clock = new ReRosteringFakes.MutableClock(NOW, ZONE);
	private final ReRosteringFakes.Absences absences = new ReRosteringFakes.Absences();
	private final InMemoryRosteringRunRepository runs = new InMemoryRosteringRunRepository();
	private final ReRosteringFakes.Candidates candidates = new ReRosteringFakes.Candidates();
	private final ReRosteringFakes.Checks checks = new ReRosteringFakes.Checks();
	private final ReRosteringFakes.Constraints constraints = new ReRosteringFakes.Constraints();
	private final ReRosteringFakes.Visits visits = new ReRosteringFakes.Visits();
	private final ReRosteringFakes.Profiles profiles = new ReRosteringFakes.Profiles();
	private final List<CredentialRegister.Cover> covers = new ArrayList<>();

	private OpenVisitService service;

	@BeforeEach
	void setUp() {
		profiles.caregiver(5L, "Aisha", false).caregiver(9L, "Farah", false).caregiver(10L, "Siti", false)
				.caregiver(11L, "Kumar", true).elder(7L, "Mdm Tan").elder(8L, "Mr Ong");
		visits.rows.put(ESCORT_VISIT, open(ESCORT_VISIT, ESCORT));
		visits.add(41L, 8L, 10L, ESCORT, 60);
		visits.history.put(7L, Map.of(9L, 3));
		absences.save(AbsenceReport.recordedByManager(5L, AbsenceReport.Type.SICK, ESCORT.toLocalDate(),
				ESCORT.toLocalDate(), "flu", 11L, NOW.toLocalDate()));

		RosterSnapshotLoader loader = new RosterSnapshotLoader(profiles, () -> covers,
				planIds -> Map.of(4L, Set.of(2L)), absences, visits, since -> Map.of(), RosterLookbacks.DEFAULT, clock);
		service = new OpenVisitService(runs, candidates, checks, constraints, loader, visits, clock);
	}

	@Test
	void theShortlistRanksWhoCanTakeTheVisitAndSaysWhyTheOthersCannot() {
		List<Shortlist.Verdict> shortlist = service.candidates(ESCORT_VISIT);

		assertThat(shortlist).extracting(Shortlist.Verdict::caregiverId).containsExactly(9L, 5L, 10L, 11L);
		assertThat(shortlist.get(0).rank()).isEqualTo(1);
		assertThat(shortlist).extracting(Shortlist.Verdict::excludedBy)
				.containsExactly(null, "NOT_ON_LEAVE", "NO_TIME_CLASH", "CERTIFICATION_VALID");
		assertThat(runs.findById(1L)).as("showing the shortlist records nothing").isEmpty();
		assertThat(candidates.rows).isEmpty();
	}

	@Test
	void assigningPutsTheCaregiverOnTheVisitAndRecordsTheRun() {
		Shortlist.Verdict chosen = service.assign(ESCORT_VISIT, 9L, 11L);

		assertThat(chosen.name()).isEqualTo("Farah");
		assertThat(visits.rows.get(ESCORT_VISIT).caregiverId()).isEqualTo(9L);
		assertThat(visits.calls).containsExactly("cover 40 with 9");

		RosteringRun run = runs.findById(1L).orElseThrow();
		assertThat(run.triggerType()).isEqualTo(RosteringRun.TriggerType.NEW_VISIT);
		assertThat(run.absenceId()).isNull();
		assertThat(run.requestedByUserId()).isEqualTo(11L);
		assertThat(run.status()).isEqualTo(RosteringRun.Status.COMMITTED);
		assertThat(run.visitsCovered()).isEqualTo(1);
		assertThat(run.continuityKept()).isEqualTo(1);
		assertThat(candidates.findByRunAndVisit(1L, ESCORT_VISIT)).hasSize(4);
		assertThat(candidates.rows.values()).filteredOn(c -> c.outcome() == RosteringCandidate.Outcome.SELECTED)
				.singleElement().extracting(RosteringCandidate::caregiverId).isEqualTo(9L);
	}

	@Test
	void somebodyTheRulesExcludeCannotBeAssigned() {
		assertThatThrownBy(() -> service.assign(ESCORT_VISIT, 10L, 11L))
				.isInstanceOf(BusinessRuleViolation.class)
				.hasMessageContaining("Siti cannot take this visit")
				.extracting("code").isEqualTo("CAREGIVER_CANNOT_TAKE_VISIT");
		assertThatThrownBy(() -> service.assign(ESCORT_VISIT, 404L, 11L)).isInstanceOf(ResourceNotFound.class);
		assertThat(visits.rows.get(ESCORT_VISIT).caregiverId()).isNull();
		assertThat(runs.findById(1L)).isEmpty();
	}

	@Test
	void aVisitThatIsHeldStartedOrPastIsNotOpen() {
		visits.rows.put(42L, open(42L, NOW.minusHours(1)));
		visits.rows.put(43L, open(43L, ESCORT));
		visits.setStatus(43L, "CANCELLED");

		for (Long visitId : List.of(41L, 42L, 43L)) {
			assertThatThrownBy(() -> service.candidates(visitId))
					.isInstanceOf(BusinessRuleViolation.class)
					.extracting("code").isEqualTo("VISIT_NOT_OPEN");
		}
		assertThatThrownBy(() -> service.assign(42L, 9L, 11L)).isInstanceOf(BusinessRuleViolation.class);
		assertThatThrownBy(() -> service.candidates(404L)).isInstanceOf(ResourceNotFound.class);
	}

	@Test
	void theSecondOfTwoManagersToAssignIsRefused() {
		service.assign(ESCORT_VISIT, 9L, 11L);

		assertThatThrownBy(() -> service.assign(ESCORT_VISIT, 9L, 12L))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting("code").isEqualTo("VISIT_NOT_OPEN");
	}

	/** An extra service as UC-FM08 dispatches it: nobody on it, no care plan, no end. */
	private static VisitSlot open(Long id, LocalDateTime start) {
		return new VisitSlot(id, 7L, null, null, "Hospital escort", start, null, "SCHEDULED", null);
	}
}
