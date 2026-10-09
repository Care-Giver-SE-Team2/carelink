package sg.nus.carelink.rostering.application;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.rostering.domain.model.RosteringRun;
import sg.nus.carelink.rostering.domain.model.VacatedSlot;
import sg.nus.carelink.rostering.domain.repository.RosteringCandidateCheckRepository;
import sg.nus.carelink.rostering.domain.repository.RosteringCandidateRepository;
import sg.nus.carelink.rostering.domain.repository.RosteringConstraintRepository;
import sg.nus.carelink.rostering.domain.repository.RosteringRunRepository;
import sg.nus.carelink.rostering.domain.service.ReplacementFinder;
import sg.nus.carelink.rostering.domain.service.RosterSnapshot;
import sg.nus.carelink.rostering.domain.service.ScoringObjective;
import sg.nus.carelink.rostering.domain.service.Shortlist;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.error.ResourceNotFound;
import sg.nus.carelink.visit.application.VisitReassignment;

/**
 * UC-MG03: a manager gives a visit nobody holds to a caregiver. Such a visit comes from a care
 * plan whose elder has no primary caregiver, or from an extra service a family approved
 * (UC-FM08), which is dispatched with nobody on it.
 *
 * <p>The same replacement search as an absence says who can take it - leave, certificates,
 * clashes, daily caps, sector, dialect - and ranks them by continuity, so the manager picks from
 * people the rules allow. Showing the shortlist records nothing; a run is recorded, with every
 * candidate and rule result behind it, when the manager assigns somebody.
 */
@Service
@Transactional
public class OpenVisitService {

	private static final RosteringRun.Objective OBJECTIVE = RosteringRun.Objective.CONTINUITY;

	private final RosteringRunRepository runs;
	private final ReplacementSearchRecord search;
	private final RosterSnapshotLoader snapshots;
	private final VisitReassignment visits;
	private final Clock clock;

	public OpenVisitService(RosteringRunRepository runs, RosteringCandidateRepository candidates,
			RosteringCandidateCheckRepository checks, RosteringConstraintRepository constraints,
			RosterSnapshotLoader snapshots, VisitReassignment visits, Clock clock) {
		this.runs = runs;
		this.search = new ReplacementSearchRecord(constraints, candidates, checks);
		this.snapshots = snapshots;
		this.visits = visits;
		this.clock = clock;
	}

	/** Everybody the search considered for the visit: who can take it, best first, then who cannot and why. */
	@Transactional(readOnly = true)
	public List<Shortlist.Verdict> candidates(Long visitId) {
		VacatedSlot slot = openSlot(visitId, now());
		return finder(search.ruleSet()).shortlist(slot, snapshots.load(List.of(slot))).all();
	}

	/**
	 * Puts {@code caregiverId} on the visit, if the rules still allow it: the roster may have
	 * changed since the shortlist was shown.
	 *
	 * @return the chosen caregiver's verdict, with their name
	 */
	public Shortlist.Verdict assign(Long visitId, Long caregiverId, Long managerUserId) {
		LocalDateTime now = now();
		VacatedSlot slot = openSlot(visitId, now);
		ReplacementSearchRecord.RuleSet rules = search.ruleSet();
		RosterSnapshot snapshot = snapshots.load(List.of(slot));
		Shortlist shortlist = finder(rules).shortlist(slot, snapshot);
		Shortlist.Verdict chosen = shortlist.all().stream()
				.filter(verdict -> verdict.caregiverId().equals(caregiverId))
				.findFirst()
				.orElseThrow(() -> new ResourceNotFound("Caregiver", caregiverId));
		if (!chosen.isSuggested()) {
			throw new BusinessRuleViolation("CAREGIVER_CANNOT_TAKE_VISIT",
					"%s cannot take this visit: %s".formatted(chosen.name(), chosen.reason()));
		}

		RosteringRun run = runs.save(RosteringRun.forNewVisit(OBJECTIVE, managerUserId, now));
		Map<Long, Long> candidateIds = search.record(run.id(), shortlist, rules);
		Long candidateId = candidateIds.get(caregiverId);
		visits.cover(visitId, caregiverId, new VisitReassignment.Change(null, managerUserId, candidateId,
				"A manager chose %s for the visit".formatted(chosen.name())));
		search.select(candidateId);
		boolean continuity = snapshot.elder(slot.elderId()).priorVisitsBy(caregiverId) > 0;
		runs.save(run.committed(1, 1, continuity ? 1 : 0, now));
		return chosen;
	}

	/** The visit as the search sees it, while it is still open: nobody on it, not started, not yet begun. */
	private VacatedSlot openSlot(Long visitId, LocalDateTime now) {
		VisitReassignment.VisitSlot visit = visits.find(visitId)
				.orElseThrow(() -> new ResourceNotFound("Visit", visitId));
		if (visit.caregiverId() != null || !"SCHEDULED".equals(visit.status()) || !visit.start().isAfter(now)) {
			throw new BusinessRuleViolation("VISIT_NOT_OPEN",
					"The visit already has a caregiver, has started, has passed or was called off");
		}
		return new VacatedSlot(visit.visitId(), visit.elderId(), visit.carePlanId(), visit.serviceType(),
				visit.start(), visit.end(), null);
	}

	private static ReplacementFinder finder(ReplacementSearchRecord.RuleSet rules) {
		return new ReplacementFinder(rules.rules(), ScoringObjective.of(OBJECTIVE));
	}

	private LocalDateTime now() {
		return LocalDateTime.now(clock);
	}
}
