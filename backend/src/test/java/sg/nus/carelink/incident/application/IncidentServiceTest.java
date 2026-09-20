package sg.nus.carelink.incident.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import sg.nus.carelink.incident.domain.model.ContactAttempt;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.model.IncidentLog;
import sg.nus.carelink.incident.domain.model.Playbook;
import sg.nus.carelink.incident.domain.service.EscalationPolicy;
import sg.nus.carelink.incident.support.FakeDutyRoster;
import sg.nus.carelink.incident.support.IncidentFixtures;
import sg.nus.carelink.incident.support.InMemoryIncidentLogRepository;
import sg.nus.carelink.incident.support.InMemoryIncidentRepository;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.error.ResourceNotFound;

/**
 * UC-MG05 from the application layer down: real domain rules, real chain, fake storage.
 *
 * <p>No Spring, no database, no scheduler. That is only possible because the ports are
 * interfaces the domain owns, which is the argument the report's layering section makes.
 */
class IncidentServiceTest {

	private final InMemoryIncidentRepository incidents = new InMemoryIncidentRepository();
	private final InMemoryIncidentLogRepository timeline = new InMemoryIncidentLogRepository();
	private final Clock clock = IncidentFixtures.clockAt(IncidentFixtures.DURING_SHIFT);

	private IncidentService service;

	@BeforeEach
	void setUp() {
		service = buildService(FakeDutyRoster
				.withManagers(IncidentFixtures.ALICE, IncidentFixtures.BEN)
				.onDuty(IncidentFixtures.ALICE));
	}

	private IncidentService buildService(FakeDutyRoster roster) {
		EscalationService escalation = new EscalationService(
				incidents, timeline, roster, EscalationPolicy.defaults(), clock);
		return new IncidentService(incidents, timeline, escalation, clock);
	}

	// -------------------------------------------------------------------- raising ---

	@Test
	void anElderSosIsRoutedTheMomentItIsRaised() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, "Blk 123", "fell");

		assertThat(raised.responderUserId()).isEqualTo(IncidentFixtures.ALICE.userId());
		assertThat(raised.respondBy()).isEqualTo(IncidentFixtures.DURING_SHIFT.plusMinutes(5));
		assertThat(timeline.actionsFor(raised.id())).containsExactly("REPORTED", "ASSIGNED");
	}

	@Test
	void aCaregiverReportIsRoutedTheSameWay() {
		Incident raised = service.reportByCaregiver(
				7L, 4L, 20L, Incident.Category.FALL, Incident.Severity.MEDIUM, "slipped");

		assertThat(raised.responderUserId()).isEqualTo(IncidentFixtures.ALICE.userId());
		assertThat(raised.respondBy()).isEqualTo(IncidentFixtures.DURING_SHIFT.plusMinutes(15));
	}

	@Test
	void withNoManagersAtAllTheIncidentIsPinnedForTheFamilyInsteadOfVanishing() {
		service = buildService(FakeDutyRoster.empty());

		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);

		assertThat(raised.status()).isEqualTo(Incident.Status.UNRESOLVED_ESCALATED);
		assertThat(raised.resolvedAt()).isNull();
		assertThat(timeline.actionsFor(raised.id())).contains("CHAIN_EXHAUSTED");
	}

	// ------------------------------------------------------------------- handling ---

	@Test
	void takingOverStopsTheCountdownAndIsRecorded() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);

		Incident claimed = service.claim(raised.id(), IncidentFixtures.BEN.userId(), "Ben");

		assertThat(claimed.status()).isEqualTo(Incident.Status.IN_PROGRESS);
		assertThat(claimed.respondBy()).isNull();
		assertThat(timeline.actionsFor(raised.id())).endsWith("CLAIMED");
	}

	@Test
	void aRefusedTakeOverIsWrittenToTheTimelineBeforeItIsRejected() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);
		service.claim(raised.id(), IncidentFixtures.ALICE.userId(), "Alice");

		assertThatThrownBy(() -> service.claim(raised.id(), IncidentFixtures.BEN.userId(), "Ben"))
				.isInstanceOf(BusinessRuleViolation.class);

		assertThat(timeline.actionsFor(raised.id())).endsWith("CLAIM_REJECTED");
	}

	@Test
	void anIncidentThatHasBeenTakenOverCannotBeEscalated() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);
		service.claim(raised.id(), IncidentFixtures.ALICE.userId(), "Alice");

		assertThatThrownBy(() -> service.escalate(raised.id(), "too slow", "Manager"))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(violation -> ((BusinessRuleViolation) violation).code())
				.isEqualTo("INCIDENT_NOT_AWAITING_TAKE_OVER");
	}

	@Test
	void escalatingByHandMovesTheIncidentToSomebodyElse() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);

		Incident escalated = service.escalate(raised.id(), "no answer", "Manager");

		assertThat(escalated.responderUserId()).isEqualTo(IncidentFixtures.BEN.userId());
		assertThat(timeline.actionsFor(raised.id())).contains("ESCALATED", "ASSIGNED");
	}

	// -------------------------------------------------------------------- contact ---

	@Test
	void reachingTheFamilyIsRecordedAndOffersNoFallback() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);

		IncidentService.ContactOutcome outcome = service.recordContactAttempt(
				raised.id(),
				new ContactAttempt(ContactAttempt.Channel.PHONE, ContactAttempt.Outcome.REACHED, "daughter"),
				"Alice");

		assertThat(outcome.hasFallback()).isFalse();
		assertThat(timeline.actionsFor(raised.id())).contains("CONTACT_ATTEMPTED");
	}

	@Test
	void failingToReachTheFamilyOffersThePlaybookForThatCategory() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);

		IncidentService.ContactOutcome outcome = service.recordContactAttempt(
				raised.id(),
				new ContactAttempt(ContactAttempt.Channel.PHONE, ContactAttempt.Outcome.NOT_REACHED, "no answer"),
				"Alice");

		assertThat(outcome.hasFallback()).isTrue();
		assertThat(outcome.suggestedPlaybook()).isEqualTo(Playbook.SOS_IMMEDIATE);
	}

	@Test
	void applyingAPlaybookMeantForAnotherCategoryIsRefused() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);

		assertThatThrownBy(() -> service.applyPlaybook(raised.id(), "PB-MED", "Alice"))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(violation -> ((BusinessRuleViolation) violation).code())
				.isEqualTo("PLAYBOOK_CATEGORY_MISMATCH");
	}

	@Test
	void applyingTheRightPlaybookIsRecorded() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);

		service.applyPlaybook(raised.id(), "PB-SOS", "Alice");

		assertThat(timeline.actionsFor(raised.id())).contains("PLAYBOOK_APPLIED");
	}

	@Test
	void anUnknownPlaybookIsNotFound() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);

		assertThatThrownBy(() -> service.applyPlaybook(raised.id(), "PB-NOPE", "Alice"))
				.isInstanceOf(ResourceNotFound.class);
	}

	// ------------------------------------------------------------------- severity ---

	@Test
	void changingTheSeverityRebuildsTheChainAndContinuesTheSameTimeline() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);

		Incident changed = service.changeSeverity(raised.id(), Incident.Severity.LOW, "calmer now", "Alice");

		assertThat(changed.severity()).isEqualTo(Incident.Severity.LOW);
		assertThat(changed.responderUserId()).isEqualTo(IncidentFixtures.ALICE.userId());
		assertThat(changed.respondBy()).isEqualTo(IncidentFixtures.DURING_SHIFT.plusMinutes(60));
		assertThat(timeline.actionsFor(raised.id())).contains("SEVERITY_CHANGED");
		assertThat(timeline.findTimeline(raised.id()).get(0).action()).isEqualTo("REPORTED");
	}

	// ------------------------------------------------------------------ resolving ---

	@Test
	void onlyTheResponderHandlingItMayCloseIt() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);
		service.claim(raised.id(), IncidentFixtures.ALICE.userId(), "Alice");

		assertThatThrownBy(() -> service.resolve(
				raised.id(), IncidentFixtures.BEN.userId(), "all fine", null, "Ben"))
				.isInstanceOf(AccessDeniedException.class);
	}

	@Test
	void closingWithoutANoteIsRefused() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);
		service.claim(raised.id(), IncidentFixtures.ALICE.userId(), "Alice");

		assertThatThrownBy(() -> service.resolve(
				raised.id(), IncidentFixtures.ALICE.userId(), "  ", null, "Alice"))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(violation -> ((BusinessRuleViolation) violation).code())
				.isEqualTo("RESOLUTION_NOTE_REQUIRED");
	}

	@Test
	void closingRecordsTheOutcomeAndTheNote() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);
		service.claim(raised.id(), IncidentFixtures.ALICE.userId(), "Alice");

		Incident resolved = service.resolve(
				raised.id(), IncidentFixtures.ALICE.userId(), "ambulance called", "REFERRED_TO_MEDICAL_CARE", "Alice");

		assertThat(resolved.status()).isEqualTo(Incident.Status.RESOLVED);
		assertThat(timeline.findTimeline(raised.id()))
				.filteredOn(entry -> "RESOLVED".equals(entry.action()))
				.singleElement()
				.extracting(IncidentLog::detail)
				.asString()
				.contains("REFERRED_TO_MEDICAL_CARE")
				.contains("ambulance called");
	}

	// -------------------------------------------------------------------- reading ---

	@Test
	void readingAnIncidentThatDoesNotExistIsNotFound() {
		assertThatThrownBy(() -> service.timelineOf(404L)).isInstanceOf(ResourceNotFound.class);
		assertThatThrownBy(() -> service.escalationChainOf(404L)).isInstanceOf(ResourceNotFound.class);
	}

	@Test
	void theChainCanBeReadWithoutChangingAnything() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, null, null);
		int entriesBefore = timeline.actionsFor(raised.id()).size();

		assertThat(service.escalationChainOf(raised.id()).levels()).isNotEmpty();
		assertThat(timeline.actionsFor(raised.id())).hasSize(entriesBefore);
	}

	@Test
	void incidentsCanBeListedPerElderAndPlaybooksAreOffered() {
		service.createElderEmergency(7L, 99L, null, null, null, null);

		assertThat(service.forElder(7L)).hasSize(1);
		assertThat(service.forElder(8L)).isEmpty();
		assertThat(service.playbooks()).containsExactly(Playbook.values());
		assertThat(service.findIncident(404L)).isEmpty();
	}
}
