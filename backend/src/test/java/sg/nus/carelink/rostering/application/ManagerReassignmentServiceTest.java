package sg.nus.carelink.rostering.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import sg.nus.carelink.identity.application.UserDirectory;
import sg.nus.carelink.incident.application.IncidentService;
import sg.nus.carelink.profile.application.CredentialRegister;
import sg.nus.carelink.rostering.domain.model.AbsenceReport;
import sg.nus.carelink.rostering.domain.model.FamilyResponseWindow;
import sg.nus.carelink.rostering.domain.model.RosterChange;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.error.ResourceNotFound;

/**
 * The manager has the final say on who takes a visit that has not started, within the hard
 * rules. It is 00:00 on the 7th. Farah (9) has visit 40 with Mdm Tan on the 10th at 10:00;
 * Aisha (5) is with Mr Ong at the same hour (visit 41); Siti (10) is free; Kumar (11) is still
 * onboarding. Visit 42, Mdm Tan on the 12th, is Aisha's, and she is on leave that day.
 */
class ManagerReassignmentServiceTest {

	private static final ZoneId ZONE = ZoneId.of("Asia/Singapore");
	private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 7, 0, 0);
	private static final LocalDateTime TENTH = LocalDateTime.of(2026, 10, 10, 10, 0);
	private static final LocalDateTime TWELFTH = LocalDateTime.of(2026, 10, 12, 10, 0);

	private final ReRosteringFakes.MutableClock clock = new ReRosteringFakes.MutableClock(NOW, ZONE);
	private final ReRosteringFakes.Absences absences = new ReRosteringFakes.Absences();
	private final ReRosteringFakes.Changes changes = new ReRosteringFakes.Changes();
	private final ReRosteringFakes.Visits visits = new ReRosteringFakes.Visits();
	private final ReRosteringFakes.Profiles profiles = new ReRosteringFakes.Profiles();
	private final ReRosteringFakes.Alerts alerts = new ReRosteringFakes.Alerts();
	private final List<CredentialRegister.Cover> covers = new ArrayList<>();

	private AbsenceReRosteringService reRostering;
	private ManagerReassignmentService service;

	@BeforeEach
	void setUp() {
		profiles.caregiver(5L, "Aisha", false).caregiver(9L, "Farah", false).caregiver(10L, "Siti", false)
				.caregiver(11L, "Kumar", true).elder(7L, "Mdm Tan").elder(8L, "Mr Ong");
		for (Long caregiver : List.of(5L, 9L, 10L)) {
			covers.add(new CredentialRegister.Cover(caregiver, caregiver, 2L, LocalDate.of(2027, 6, 30)));
		}
		visits.add(40L, 7L, 9L, TENTH, 60).add(41L, 8L, 5L, TENTH, 60).add(42L, 7L, 5L, TWELFTH, 60);

		RosterSnapshotLoader loader = new RosterSnapshotLoader(profiles, () -> covers,
				planIds -> Map.of(4L, Set.of(2L)), absences, visits, since -> Map.of(), RosterLookbacks.DEFAULT, clock, 0);
		ReRosteringFakes.Constraints constraints = new ReRosteringFakes.Constraints();
		ReRosteringFakes.Candidates candidates = new ReRosteringFakes.Candidates();
		ReRosteringFakes.Checks checks = new ReRosteringFakes.Checks();
		reRostering = new AbsenceReRosteringService(absences, changes, new InMemoryRosteringRunRepository(), candidates,
				checks, constraints, loader, visits, profiles, mock(IncidentService.class), new ReRosteringFakes.Family(),
				mock(UserDirectory.class), alerts, new ReRosteringFakes.Audit(), FamilyResponseWindow.DEFAULT, clock);
		service = new ManagerReassignmentService(visits, changes, reRostering, loader, constraints, candidates, checks,
				profiles, alerts, clock);
	}

	@Test
	void optionsLeaveOutWhoeverHasTheVisitAndListWhoCanGoFirst() {
		List<VisitCover.Option> options = service.options(40L);

		assertThat(options).extracting(VisitCover.Option::caregiverId).doesNotContain(9L);
		assertThat(options.get(0).caregiverId()).isEqualTo(10L);
		assertThat(options.get(0).eligible()).isTrue();
		assertThat(options).filteredOn(option -> option.caregiverId().equals(5L)).singleElement()
				.satisfies(aisha -> assertThat(aisha.eligible()).as("Aisha is with Mr Ong then").isFalse());
	}

	@Test
	void aManagerGivesABookedVisitToSomebodyElseAndEverybodyIsTold() {
		service.reassign(40L, 10L, "  Farah asked for the morning off  ", 12L);

		assertThat(visits.rows.get(40L).caregiverId()).isEqualTo(10L);
		assertThat(visits.reasons).singleElement().satisfies(why -> {
			assertThat(why.byUserId()).isEqualTo(12L);
			assertThat(why.absenceId()).isNull();
			assertThat(why.reason()).isEqualTo("Reassigned by a manager: Farah asked for the morning off");
		});
		assertThat(alerts.sent).containsExactly("reassigned visit 40 from 9 to 10");
		assertThat(changes.rows).as("no absence is involved").isEmpty();
	}

	@Test
	void aCaregiverAHardRuleExcludesIsRefusedWithTheReason() {
		assertThatThrownBy(() -> service.reassign(40L, 5L, "swap", 12L))
				.isInstanceOf(BusinessRuleViolation.class)
				.hasMessageStartingWith("Aisha cannot take this visit: ")
				.extracting("code").isEqualTo("CAREGIVER_CANNOT_TAKE_VISIT");
		assertThat(visits.rows.get(40L).caregiverId()).isEqualTo(9L);
		assertThat(alerts.sent).isEmpty();
	}

	@Test
	void theCaregiverWhoAlreadyHasTheVisitIsNotAChange() {
		assertThatThrownBy(() -> service.reassign(40L, 9L, "again", 12L))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting("code").isEqualTo("ALREADY_ASSIGNED");
	}

	@Test
	void aReasonIsRequired() {
		assertThatThrownBy(() -> service.reassign(40L, 10L, " ", 12L))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting("code").isEqualTo("REASON_REQUIRED");
	}

	@Test
	void aVisitThatHasStartedOrIsCalledOffCannotBeReassigned() {
		clock.set(TENTH.plusMinutes(5));
		assertThatThrownBy(() -> service.options(40L))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting("code").isEqualTo("VISIT_NOT_OPEN");

		clock.set(NOW);
		visits.setStatus(40L, "CANCELLED");
		assertThatThrownBy(() -> service.reassign(40L, 10L, "swap", 12L))
				.isInstanceOf(BusinessRuleViolation.class)
				.hasMessageContaining("CANCELLED");
	}

	@Test
	void aManagerCancelsABookedVisitAndEverybodyIsTold() {
		service.cancel(40L, "  Mdm Tan is at the hospital  ", 12L);

		assertThat(visits.rows.get(40L).status()).isEqualTo("CANCELLED");
		assertThat(visits.reasons).singleElement().satisfies(why -> {
			assertThat(why.byUserId()).isEqualTo(12L);
			assertThat(why.absenceId()).isNull();
			assertThat(why.reason()).isEqualTo("Cancelled by a manager: Mdm Tan is at the hospital");
		});
		assertThat(alerts.sent).containsExactly("cancelled visit 40 of 9");
		assertThat(visits.rows.get(42L).status()).as("only that visit").isEqualTo("SCHEDULED");
	}

	@Test
	void cancellingNeedsAReasonAndAVisitStillAhead() {
		assertThatThrownBy(() -> service.cancel(40L, " ", 12L))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting("code").isEqualTo("REASON_REQUIRED");

		clock.set(TENTH.plusMinutes(5));
		assertThatThrownBy(() -> service.cancel(40L, "Too late", 12L))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting("code").isEqualTo("VISIT_NOT_OPEN");

		clock.set(NOW);
		visits.setStatus(40L, "CANCELLED");
		assertThatThrownBy(() -> service.cancel(40L, "Twice", 12L))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting("code").isEqualTo("VISIT_NOT_OPEN");
		assertThat(alerts.sent).isEmpty();
	}

	@Test
	void aVisitAnAbsenceVacatedIsSettledOnTheAbsenceNotCancelledHere() {
		Long absenceId = absences.save(AbsenceReport.recordedByManager(5L, AbsenceReport.Type.SICK,
				TWELFTH.toLocalDate(), TWELFTH.toLocalDate(), "flu", 12L, NOW.toLocalDate())).id();
		reRostering.reroster(absenceId, null, 12L);
		alerts.sent.clear();

		assertThatThrownBy(() -> service.cancel(42L, "Not needed", 12L))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting("code").isEqualTo("VISIT_IN_ABSENCE");
		assertThat(alerts.sent).isEmpty();
	}

	@Test
	void anUnknownVisitIsNotFound() {
		assertThatThrownBy(() -> service.options(999L)).isInstanceOf(ResourceNotFound.class);
	}

	@Test
	void aVisitAnAbsenceVacatedIsSettledThroughTheAbsenceAndTheFamilysOfferIsClosed() {
		Long absenceId = absences.save(AbsenceReport.recordedByManager(5L, AbsenceReport.Type.SICK,
				TWELFTH.toLocalDate(), TWELFTH.toLocalDate(), "flu", 12L, NOW.toLocalDate())).id();
		reRostering.reroster(absenceId, null, 12L);
		RosterChange offered = changes.forVisit(42L);
		assertThat(offered.awaitingFamily()).isTrue();
		Long other = offered.proposedCaregiverId().equals(9L) ? 10L : 9L;

		service.reassign(42L, other, "Knows Mdm Tan's routine", 12L);

		RosterChange settled = changes.forVisit(42L);
		assertThat(settled.status()).isEqualTo(RosterChange.Status.RESOLVED);
		assertThat(settled.decidedBy()).isEqualTo(RosterChange.DecidedBy.MANAGER);
		assertThat(settled.assignedCaregiverId()).isEqualTo(other);
		assertThat(settled.note()).endsWith(": Knows Mdm Tan's routine");
		assertThat(visits.rows.get(42L).caregiverId()).isEqualTo(other);
		assertThat(visits.rows.get(42L).absenceId()).as("still accounted to the absence").isEqualTo(absenceId);
		assertThat(alerts.sent).last().isEqualTo("settled REPLACED visit 42");
	}
}
