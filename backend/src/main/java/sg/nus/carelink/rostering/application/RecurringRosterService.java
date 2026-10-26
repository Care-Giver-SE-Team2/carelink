package sg.nus.carelink.rostering.application;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.careplan.application.CarePlanSchedules;
import sg.nus.carelink.profile.application.PrimaryCaregiverLookup;
import sg.nus.carelink.rostering.domain.model.RecurringSchedule;
import sg.nus.carelink.rostering.domain.model.RecurringSchedule.RecurringTask;
import sg.nus.carelink.rostering.domain.model.RecurringSchedule.WeeklySlot;
import sg.nus.carelink.visit.application.VisitScheduling;
import sg.nus.carelink.visit.application.VisitScheduling.CarriedVisit;
import sg.nus.carelink.visit.application.VisitScheduling.PlannedVisit;

/**
 * UC-MG03: keeps an elder's visits in step with their care plan. Publishing a plan sets the
 * weekly pattern; this turns it into dated visits for the next {@code horizonDays} days,
 * given to the elder's primary caregiver, or left unassigned to be covered when there is none.
 *
 * <p>A refresh is safe to repeat. It runs when a plan is published or stopped, when a primary
 * caregiver is named or removed, and nightly to roll the window forward. A primary caregiver who
 * can no longer take visits (gone inactive, however that happened) is taken off the ones nobody
 * has started, so they are covered rather than missed; the nightly run catches any it missed. When a plan version ends
 * (stopped, or replaced from its successor's start date) its visits nobody has started are
 * cancelled from that date; visits under way or finished are kept. A replaced version's visit
 * whose task and time the successor keeps unchanged is moved to the successor instead, so the
 * caregiver doesn't see it cancelled and booked again.
 */
@Service
@Transactional
public class RecurringRosterService {

	private final CarePlanSchedules schedules;
	private final PrimaryCaregiverLookup primaryCaregivers;
	private final VisitScheduling visits;
	private final Clock clock;
	private final int horizonDays;

	public RecurringRosterService(CarePlanSchedules schedules, PrimaryCaregiverLookup primaryCaregivers,
			VisitScheduling visits, Clock clock, @Value("${carelink.roster.horizon-days:14}") int horizonDays) {
		this.schedules = schedules;
		this.primaryCaregivers = primaryCaregivers;
		this.visits = visits;
		this.clock = clock;
		this.horizonDays = horizonDays;
	}

	/**
	 * Brings one elder's visits for today and the next {@code horizonDays - 1} days in line
	 * with their plan. Always its own transaction: it is called after a publish has committed,
	 * and once per elder by the nightly run, and in both cases a failure must stay contained
	 * to this elder's refresh.
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public RosterRefresh refreshElder(Long elderId) {
		LocalDateTime now = LocalDateTime.now(clock);
		LocalDate untilDay = now.toLocalDate().plusDays(horizonDays);
		List<RecurringSchedule> versions = schedules.forElder(elderId).stream()
				.map(RecurringRosterService::toDomain)
				.toList();

		int released = primaryCaregivers.findUnrosterableCaregiverId(elderId)
				.map(caregiverId -> visits.releaseUntouchedFrom(elderId, caregiverId, now))
				.orElse(0);

		List<CarriedVisit> kept = versions.stream()
				.flatMap(version -> successorOf(version, versions).stream()
						.flatMap(successor -> version.carriedInto(successor, now, untilDay).stream()))
				.map(slot -> new CarriedVisit(slot.fromCarePlanId(), slot.fromCarePlanNodeId(), slot.to().carePlanId(),
						slot.to().carePlanNodeId(), slot.to().serviceType(), slot.to().start(), slot.to().end()))
				.toList();
		int carried = kept.isEmpty() ? 0 : visits.carryOver(kept);

		int cancelled = 0;
		for (RecurringSchedule version : versions) {
			cancelled += version.callOffFrom(now)
					.map(from -> visits.cancelUntouchedFrom(version.carePlanId(), from))
					.orElse(0);
		}

		Long caregiverId = primaryCaregivers.findRosterableCaregiverId(elderId).orElse(null);
		// A slot already running is only worth creating for someone who can still go: left
		// unassigned it would turn straight into an uncovered-visit exception. Once a primary
		// caregiver is named, that refresh creates it for them if it is still running.
		List<PlannedVisit> wanted = versions.stream()
				.flatMap(version -> version.visitsBetween(now, untilDay).stream())
				.filter(slot -> caregiverId != null || !slot.start().isBefore(now))
				.map(slot -> new PlannedVisit(slot.elderId(), caregiverId, slot.carePlanId(), slot.carePlanNodeId(),
						slot.serviceType(), slot.start(), slot.end()))
				.toList();
		VisitScheduling.Outcome outcome = wanted.isEmpty()
				? new VisitScheduling.Outcome(0, 0)
				: visits.schedule(wanted);

		return new RosterRefresh(elderId, outcome.created(), outcome.covered(), carried, cancelled, released);
	}

	/**
	 * Takes a caregiver who is no longer the elder's primary caregiver off the elder's plan visits
	 * that nobody has started, from now on, so the next refresh can give them to whoever replaced
	 * them, or leave them to be covered. Visits that should already have started are left for the
	 * missed-check-in rule, as when a plan ends. Its own transaction, like refreshElder.
	 *
	 * @return how many visits were released
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public int releaseFormerPrimary(Long elderId, Long caregiverId) {
		return visits.releaseUntouchedFrom(elderId, caregiverId, LocalDateTime.now(clock));
	}

	/** Every elder whose plan has ever been published: the nightly run refreshes each in turn. */
	@Transactional(readOnly = true)
	public List<Long> eldersToRefresh() {
		return schedules.eldersWithSchedules();
	}

	/** The latest version that took over on the day {@code version} ended, if any. */
	private static Optional<RecurringSchedule> successorOf(RecurringSchedule version,
			List<RecurringSchedule> versions) {
		return versions.reversed().stream()
				.filter(other -> !other.carePlanId().equals(version.carePlanId())
						&& other.effectiveFrom().equals(version.effectiveUntil()))
				.findFirst();
	}

	private static RecurringSchedule toDomain(CarePlanSchedules.PlanSchedule plan) {
		return new RecurringSchedule(plan.carePlanId(), plan.elderId(), plan.effectiveFrom(), plan.effectiveUntil(),
				plan.tasks().stream()
						.map(task -> new RecurringTask(task.carePlanNodeId(), task.groupName(), task.activityCode(),
								task.name(), task.slots().stream()
								.map(slot -> new WeeklySlot(slot.day(), slot.startTime(), slot.minutes()))
								.toList()))
						.toList());
	}

	/** What one refresh changed. */
	public record RosterRefresh(Long elderId, int created, int covered, int carried, int cancelled, int released) {
	}
}
