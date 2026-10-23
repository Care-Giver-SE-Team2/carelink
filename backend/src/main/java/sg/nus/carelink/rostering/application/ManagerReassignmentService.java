package sg.nus.carelink.rostering.application;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.profile.application.RosteringProfiles;
import sg.nus.carelink.rostering.domain.model.RosterChange;
import sg.nus.carelink.rostering.domain.model.VacatedSlot;
import sg.nus.carelink.rostering.domain.repository.RosterChangeAlert;
import sg.nus.carelink.rostering.domain.repository.RosterChangeRepository;
import sg.nus.carelink.rostering.domain.repository.RosteringCandidateCheckRepository;
import sg.nus.carelink.rostering.domain.repository.RosteringCandidateRepository;
import sg.nus.carelink.rostering.domain.repository.RosteringConstraintRepository;
import sg.nus.carelink.rostering.domain.service.ReplacementFinder;
import sg.nus.carelink.rostering.domain.service.ScoringObjective;
import sg.nus.carelink.rostering.domain.service.Shortlist;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.error.ResourceNotFound;
import sg.nus.carelink.visit.application.VisitReassignment;

/**
 * The manager has the final say on who takes any visit that has not started: they pick the
 * caregiver from the same search an absence's re-rostering runs, and nobody's earlier choice -
 * the primary caregiver's roster, the default plan, the family's pick - stands in the way. Every
 * hard rule still applies; the manager chooses among who may go, not around the rules.
 *
 * <p>A visit an absence vacated is still that absence's business, so the change goes through
 * {@link AbsenceReRosteringService#assignByManager} and the absence keeps accounting for it; a
 * family still choosing has their offer closed by it. Any other visit is handed over directly,
 * recorded in its assignment history with the manager's reason, and everybody it touches is
 * told who is coming. The reason is kept for the record, never shown to the family.
 */
@Service
@Transactional
public class ManagerReassignmentService {

	static final String REASON_PREFIX = "Reassigned by a manager: ";

	private final VisitReassignment visits;
	private final RosterChangeRepository changes;
	private final AbsenceReRosteringService absences;
	private final RosterSnapshotLoader snapshots;
	private final ReplacementSearchRecord search;
	private final RosteringProfiles profiles;
	private final RosterChangeAlert alert;
	private final Clock clock;

	@SuppressWarnings("java:S107") // the search's three tables come in separately, as in VisitCoverService
	public ManagerReassignmentService(VisitReassignment visits, RosterChangeRepository changes,
			AbsenceReRosteringService absences, RosterSnapshotLoader snapshots,
			RosteringConstraintRepository constraints, RosteringCandidateRepository candidates,
			RosteringCandidateCheckRepository checks, RosteringProfiles profiles, RosterChangeAlert alert,
			Clock clock) {
		this.visits = visits;
		this.changes = changes;
		this.absences = absences;
		this.snapshots = snapshots;
		this.search = new ReplacementSearchRecord(constraints, candidates, checks);
		this.profiles = profiles;
		this.alert = alert;
		this.clock = clock;
	}

	/**
	 * Who could take the visit instead: those who pass every hard rule, best first, then those
	 * who do not, each with the rule that stopped them. Whoever has the visit now is left out.
	 */
	@Transactional(readOnly = true)
	public List<VisitCover.Option> options(Long visitId) {
		VisitReassignment.VisitSlot visit = requireReassignable(visitId);
		return shortlist(visit).all().stream()
				.filter(verdict -> !verdict.caregiverId().equals(visit.caregiverId()))
				.map(verdict -> new VisitCover.Option(verdict.caregiverId(), verdict.name(), verdict.rank(),
						verdict.reason()))
				.toList();
	}

	/**
	 * Gives the visit to {@code caregiverId}, after checking again that they pass every hard
	 * rule against the roster as it is now.
	 *
	 * @param reason why the manager is changing it, for the record
	 */
	public void reassign(Long visitId, Long caregiverId, String reason, Long managerUserId) {
		Objects.requireNonNull(caregiverId, "caregiverId");
		if (reason == null || reason.isBlank()) {
			throw new BusinessRuleViolation("REASON_REQUIRED", "Say why the visit is changing hands");
		}
		VisitReassignment.VisitSlot visit = requireReassignable(visitId);
		Optional<RosterChange> change = absenceChange(visitId);
		if (change.isPresent()) {
			absences.assignByManager(change.get().absenceId(), change.get().id(), caregiverId, managerUserId, reason);
			return;
		}
		if (caregiverId.equals(visit.caregiverId())) {
			throw new BusinessRuleViolation("ALREADY_ASSIGNED",
					"Caregiver %d already has visit %d".formatted(caregiverId, visitId));
		}
		Shortlist.Verdict chosen = shortlist(visit).all().stream()
				.filter(verdict -> verdict.caregiverId().equals(caregiverId))
				.findFirst()
				.orElseThrow(() -> new ResourceNotFound("Caregiver", caregiverId));
		if (!chosen.isSuggested()) {
			throw new BusinessRuleViolation("CAREGIVER_CANNOT_TAKE_VISIT",
					"%s cannot take this visit: %s".formatted(chosen.name(), chosen.reason()));
		}

		visits.reassign(visitId, caregiverId,
				new VisitReassignment.Change(null, managerUserId, null, REASON_PREFIX + reason.strip()));
		String elderName = profiles.elder(visit.elderId()).map(RosteringProfiles.ElderFacts::fullName).orElse(null);
		alert.reassigned(new RosterChangeAlert.Reassignment(visitId, visit.elderId(), visit.start(),
				visit.caregiverId(), caregiverId, chosen.name(), elderName));
	}

	/**
	 * The visit, provided it is still ahead and either booked as usual or one an absence left
	 * for the manager to settle (an uncovered one has no caregiver and is an exception).
	 */
	private VisitReassignment.VisitSlot requireReassignable(Long visitId) {
		VisitReassignment.VisitSlot visit = visits.find(visitId)
				.orElseThrow(() -> new ResourceNotFound("Visit", visitId));
		if (!visit.start().isAfter(LocalDateTime.now(clock))) {
			throw new BusinessRuleViolation("VISIT_NOT_OPEN",
					"Visit %d has started or passed, so it can no longer be reassigned".formatted(visitId));
		}
		if (!"SCHEDULED".equals(visit.status()) && absenceChange(visitId).isEmpty()) {
			throw new BusinessRuleViolation("VISIT_NOT_OPEN",
					"Visit %d is %s and can no longer be reassigned".formatted(visitId, visit.status()));
		}
		return visit;
	}

	/** The absence change that still answers for this visit, if an absence vacated it. */
	private Optional<RosterChange> absenceChange(Long visitId) {
		return changes.findLatestByVisitId(visitId).filter(RosterChange::managerMayAssign);
	}

	private Shortlist shortlist(VisitReassignment.VisitSlot visit) {
		VacatedSlot slot = new VacatedSlot(visit.visitId(), visit.elderId(), visit.carePlanId(), visit.serviceType(),
				visit.start(), visit.end(), visit.caregiverId());
		ReplacementFinder finder = new ReplacementFinder(search.ruleSet().rules(), ScoringObjective.of(null));
		return finder.shortlist(slot, snapshots.load(List.of(slot)));
	}
}
