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
import sg.nus.carelink.incident.support.FakeManagerDirectory;
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
	private final Clock clock = IncidentFixtures.clockAt(IncidentFixtures.RAISED_AT);

	private IncidentService service;

	@BeforeEach
	void setUp() {
		service = buildService(FakeManagerDirectory.with(IncidentFixtures.ALICE, IncidentFixtures.BEN));
	}

	/** An incident raised through the manager module's own entry point, so it is routed. */
	private Incident raise() {
		return service.reportByCaregiver(
				7L, null, 20L, Incident.Category.SOS, Incident.Severity.HIGH, "SOS");
	}

	private IncidentService buildService(FakeManagerDirectory directory) {
		EscalationService escalation = new EscalationService(
				incidents, timeline, directory, EscalationPolicy.defaults(), clock);
		return new IncidentService(incidents, timeline, escalation, clock);
	}

	// -------------------------------------------------------------------- raising ---

	@Test
	void aCaregiverReportIsRoutedTheMomentItIsRaised() {
		Incident raised = service.reportByCaregiver(
				7L, 4L, 20L, Incident.Category.FALL, Incident.Severity.MEDIUM, "slipped");

		assertThat(raised.responderUserId()).isEqualTo(IncidentFixtures.ALICE.userId());
		assertThat(raised.respondBy()).isEqualTo(IncidentFixtures.RAISED_AT.plusMinutes(15));
		assertThat(timeline.actionsFor(raised.id())).containsExactly("REPORTED", "ASSIGNED");
	}

	/**
	 * Records the gap rather than papering over it. UC-EL03 belongs to the elder module and
	 * still stops at "saved"; routing it is one line in that module's own method, and is
	 * raised there rather than changed from here.
	 */
	@Test
	void anElderSosIsNotRoutedYetAndThatIsTheKnownGap() {
		Incident raised = service.createElderEmergency(7L, 99L, null, null, "Blk 123", "fell");

		assertThat(raised.responderUserId()).isNull();
		assertThat(raised.respondBy()).isNull();
	}

	@Test
	void withNoManagersAtAllTheIncidentIsPinnedForTheFamilyInsteadOfVanishing() {
		service = buildService(FakeManagerDirectory.empty());

		Incident raised = raise();

		assertThat(raised.status()).isEqualTo(Incident.Status.UNRESOLVED_ESCALATED);
		assertThat(raised.resolvedAt()).isNull();
		assertThat(timeline.actionsFor(raised.id())).contains("CHAIN_EXHAUSTED");
	}

	// ------------------------------------------------------------------- handling ---

	@Test
	void takingOverStopsTheCountdownAndIsRecorded() {
		Incident raised = raise();

		Incident claimed = service.claim(raised.id(), IncidentFixtures.BEN.userId(), "Ben");

		assertThat(claimed.status()).isEqualTo(Incident.Status.IN_PROGRESS);
		assertThat(claimed.respondBy()).isNull();
		assertThat(timeline.actionsFor(raised.id())).endsWith("CLAIMED");
	}

	@Test
	void aRefusedTakeOverIsWrittenToTheTimelineBeforeItIsRejected() {
		Incident raised = raise();
		service.claim(raised.id(), IncidentFixtures.ALICE.userId(), "Alice");

		Long incidentId = raised.id();
		Long ben = IncidentFixtures.BEN.userId();
		assertThatThrownBy(() -> service.claim(incidentId, ben, "Ben"))
				.isInstanceOf(BusinessRuleViolation.class);

		assertThat(timeline.actionsFor(raised.id())).endsWith("CLAIM_REJECTED");
	}

	@Test
	void anIncidentThatHasBeenTakenOverCannotBeEscalated() {
		Incident raised = raise();
		service.claim(raised.id(), IncidentFixtures.ALICE.userId(), "Alice");

		Long incidentId = raised.id();
		assertThatThrownBy(() -> service.escalate(incidentId, "too slow", "Manager"))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(violation -> ((BusinessRuleViolation) violation).code())
				.isEqualTo("INCIDENT_NOT_AWAITING_TAKE_OVER");
	}

	@Test
	void escalatingByHandMovesTheIncidentToSomebodyElse() {
		Incident raised = raise();

		Incident escalated = service.escalate(raised.id(), "no answer", "Manager");

		assertThat(escalated.responderUserId()).isEqualTo(IncidentFixtures.BEN.userId());
		assertThat(timeline.actionsFor(raised.id())).contains("ESCALATED", "ASSIGNED");
	}

	// -------------------------------------------------------------------- contact ---

	@Test
	void reachingTheFamilyIsRecordedAndOffersNoFallback() {
		Incident raised = raise();

		IncidentService.ContactOutcome outcome = service.recordContactAttempt(
				raised.id(),
				new ContactAttempt(ContactAttempt.Channel.PHONE, ContactAttempt.Outcome.REACHED, "daughter"),
				"Alice");

		assertThat(outcome.hasFallback()).isFalse();
		assertThat(timeline.actionsFor(raised.id())).contains("CONTACT_ATTEMPTED");
	}

	@Test
	void failingToReachTheFamilyOffersThePlaybookForThatCategory() {
		Incident raised = raise();

		IncidentService.ContactOutcome outcome = service.recordContactAttempt(
				raised.id(),
				new ContactAttempt(ContactAttempt.Channel.PHONE, ContactAttempt.Outcome.NOT_REACHED, "no answer"),
				"Alice");

		assertThat(outcome.hasFallback()).isTrue();
		assertThat(outcome.suggestedPlaybook()).isEqualTo(Playbook.SOS_IMMEDIATE);
	}

	@Test
	void applyingAPlaybookMeantForAnotherCategoryIsRefused() {
		Incident raised = raise();

		Long incidentId = raised.id();
		assertThatThrownBy(() -> service.applyPlaybook(incidentId, "PB-MED", "Alice"))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(violation -> ((BusinessRuleViolation) violation).code())
				.isEqualTo("PLAYBOOK_CATEGORY_MISMATCH");
	}

	@Test
	void applyingTheRightPlaybookIsRecorded() {
		Incident raised = raise();

		service.applyPlaybook(raised.id(), "PB-SOS", "Alice");

		assertThat(timeline.actionsFor(raised.id())).contains("PLAYBOOK_APPLIED");
	}

	@Test
	void anUnknownPlaybookIsNotFound() {
		Incident raised = raise();

		Long incidentId = raised.id();
		assertThatThrownBy(() -> service.applyPlaybook(incidentId, "PB-NOPE", "Alice"))
				.isInstanceOf(ResourceNotFound.class);
	}

	// ------------------------------------------------------------------- severity ---

	@Test
	void changingTheSeverityRebuildsTheChainAndContinuesTheSameTimeline() {
		Incident raised = raise();

		Incident changed = service.changeSeverity(raised.id(), Incident.Severity.LOW, "calmer now", "Alice");

		assertThat(changed.severity()).isEqualTo(Incident.Severity.LOW);
		assertThat(changed.responderUserId()).isEqualTo(IncidentFixtures.ALICE.userId());
		assertThat(changed.respondBy()).isEqualTo(IncidentFixtures.RAISED_AT.plusMinutes(60));
		assertThat(timeline.actionsFor(raised.id())).contains("SEVERITY_CHANGED");
		assertThat(timeline.findTimeline(raised.id()).get(0).action()).isEqualTo("REPORTED");
	}

	// ------------------------------------------------------------------ resolving ---

	@Test
	void onlyTheResponderHandlingItMayCloseIt() {
		Incident raised = raise();
		service.claim(raised.id(), IncidentFixtures.ALICE.userId(), "Alice");

		Long incidentId = raised.id();
		Long ben = IncidentFixtures.BEN.userId();
		assertThatThrownBy(() -> service.resolve(incidentId, ben, "all fine", null, "Ben"))
				.isInstanceOf(AccessDeniedException.class);
	}

	@Test
	void closingWithoutANoteIsRefused() {
		Incident raised = raise();
		service.claim(raised.id(), IncidentFixtures.ALICE.userId(), "Alice");

		Long incidentId = raised.id();
		Long alice = IncidentFixtures.ALICE.userId();
		assertThatThrownBy(() -> service.resolve(incidentId, alice, "  ", null, "Alice"))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(violation -> ((BusinessRuleViolation) violation).code())
				.isEqualTo("RESOLUTION_NOTE_REQUIRED");
	}

	@Test
	void closingRecordsTheOutcomeAndTheNote() {
		Incident raised = raise();
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
		Incident raised = raise();
		int entriesBefore = timeline.actionsFor(raised.id()).size();

		assertThat(service.escalationChainOf(raised.id()).levels()).isNotEmpty();
		assertThat(timeline.actionsFor(raised.id())).hasSize(entriesBefore);
	}

	@Test
	void incidentsCanBeListedPerElderAndPlaybooksAreOffered() {
		raise();

		assertThat(service.forElder(7L)).hasSize(1);
		assertThat(service.forElder(8L)).isEmpty();
		assertThat(service.playbooks()).containsExactly(Playbook.values());
		assertThat(service.findIncident(404L)).isEmpty();
	}
}
