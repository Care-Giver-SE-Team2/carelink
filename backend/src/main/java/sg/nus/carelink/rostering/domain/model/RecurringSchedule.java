package sg.nus.carelink.rostering.domain.model;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * UC-MG03: one care plan version's weekly pattern, as rostering sees it. The plan says "Mon and
 * Wed at 08:00 for 30 minutes, from 1 Oct"; this turns that into the dated visits a window of
 * days needs, and says from when the version's remaining visits must be called off.
 *
 * <p>{@code effectiveUntil} is exclusive and null while the version is the elder's current,
 * open-ended plan.
 */
public record RecurringSchedule(Long carePlanId, Long elderId, LocalDate effectiveFrom, LocalDate effectiveUntil,
		List<RecurringTask> tasks) {

	public RecurringSchedule {
		Objects.requireNonNull(carePlanId, "carePlanId");
		Objects.requireNonNull(elderId, "elderId");
		Objects.requireNonNull(effectiveFrom, "effectiveFrom");
		tasks = List.copyOf(tasks);
	}

	/**
	 * Every visit this version calls for that has not ended by {@code from} and falls on a day
	 * before {@code untilDay}, within the days the version is in force. Earliest first. A visit
	 * whose slot is already running is included: it can still be checked in until its end.
	 */
	public List<VisitSlot> visitsBetween(LocalDateTime from, LocalDate untilDay) {
		LocalDate first = later(from.toLocalDate(), effectiveFrom);
		LocalDate end = effectiveUntil == null || untilDay.isBefore(effectiveUntil) ? untilDay : effectiveUntil;
		List<VisitSlot> slots = new ArrayList<>();
		for (LocalDate day = first; day.isBefore(end); day = day.plusDays(1)) {
			slots.addAll(visitsOn(day, from));
		}
		slots.sort(Comparator.comparing(VisitSlot::start).thenComparing(VisitSlot::carePlanNodeId));
		return slots;
	}

	/** The visits one day calls for, leaving out any that have ended by {@code from}. */
	private List<VisitSlot> visitsOn(LocalDate day, LocalDateTime from) {
		return tasks.stream()
				.flatMap(task -> task.slots().stream()
						.filter(weekly -> weekly.day().equals(day.getDayOfWeek()))
						.map(weekly -> {
							LocalDateTime start = day.atTime(weekly.startTime());
							return new VisitSlot(carePlanId, task.carePlanNodeId(), elderId, task.serviceType(),
									start, start.plusMinutes(weekly.minutes()));
						}))
				.filter(slot -> slot.end().isAfter(from))
				.toList();
	}

	/**
	 * From when this version's visits that nobody has started must be called off: the day it
	 * stopped or was replaced, but never earlier than {@code now}, so a visit whose slot is over
	 * is left for the missed-check-in rule instead of quietly disappearing. One still running at
	 * that time is called off too, unless the version that replaced it keeps that slot (see
	 * {@link #carriedInto}). Empty while the version is still open-ended.
	 */
	public Optional<LocalDateTime> callOffFrom(LocalDateTime now) {
		if (effectiveUntil == null) {
			return Optional.empty();
		}
		LocalDateTime ended = effectiveUntil.atStartOfDay();
		return Optional.of(ended.isAfter(now) ? ended : now);
	}

	/**
	 * The visits {@code successor} calls for, from when this version's are called off until
	 * {@code untilDay}, that this version already called for unchanged: the same task (sub-plan,
	 * activity and name) on the same day, at the same time, for as long. Their visits move to the
	 * successor rather than being cancelled and made again, so republishing a plan to add one
	 * task leaves everyone's other visits as they were. Empty unless {@code successor} took over
	 * on the day this version ended.
	 */
	public List<CarriedSlot> carriedInto(RecurringSchedule successor, LocalDateTime now, LocalDate untilDay) {
		Optional<LocalDateTime> from = callOffFrom(now);
		if (from.isEmpty() || !successor.effectiveFrom().equals(effectiveUntil)) {
			return List.of();
		}
		List<CarriedSlot> carried = new ArrayList<>();
		for (VisitSlot slot : successor.visitsBetween(from.get(), untilDay)) {
			RecurringTask task = successor.task(slot.carePlanNodeId());
			WeeklySlot weekly = new WeeklySlot(slot.start().getDayOfWeek(), slot.start().toLocalTime(),
					(int) Duration.between(slot.start(), slot.end()).toMinutes());
			tasks.stream()
					.filter(previous -> previous.sameTaskAs(task) && previous.slots().contains(weekly))
					.findFirst()
					.ifPresent(previous -> carried.add(new CarriedSlot(carePlanId, previous.carePlanNodeId(), slot)));
		}
		return carried;
	}

	private RecurringTask task(Long carePlanNodeId) {
		return tasks.stream().filter(task -> task.carePlanNodeId().equals(carePlanNodeId)).findFirst().orElseThrow();
	}

	private static LocalDate later(LocalDate a, LocalDate b) {
		return a.isAfter(b) ? a : b;
	}

	/**
	 * A plan task and the days it recurs on. {@code groupName} (its sub-plan) and
	 * {@code activityCode} may be null.
	 */
	public record RecurringTask(Long carePlanNodeId, String groupName, String activityCode, String serviceType,
			List<WeeklySlot> slots) {

		/** visit.service_type holds 50 characters; a task name may be longer. */
		static final int SERVICE_TYPE_LENGTH = 50;

		public RecurringTask {
			Objects.requireNonNull(carePlanNodeId, "carePlanNodeId");
			if (serviceType != null && serviceType.length() > SERVICE_TYPE_LENGTH) {
				serviceType = serviceType.substring(0, SERVICE_TYPE_LENGTH - 1) + "…";
			}
			slots = List.copyOf(slots);
		}

		/** The same task in another plan version: each version gives its tasks new ids. */
		boolean sameTaskAs(RecurringTask other) {
			return Objects.equals(groupName, other.groupName) && Objects.equals(activityCode, other.activityCode)
					&& Objects.equals(serviceType, other.serviceType);
		}
	}

	/** One recurring day of a task: Monday at 08:00 for 30 minutes. */
	public record WeeklySlot(DayOfWeek day, LocalTime startTime, int minutes) {

		public WeeklySlot {
			Objects.requireNonNull(day, "day");
			Objects.requireNonNull(startTime, "startTime");
			if (minutes < 1) {
				throw new IllegalArgumentException("minutes must be at least 1, got " + minutes);
			}
		}
	}

	/** One dated visit a task calls for. */
	public record VisitSlot(Long carePlanId, Long carePlanNodeId, Long elderId, String serviceType,
			LocalDateTime start, LocalDateTime end) {
	}

	/** A successor's visit that the replaced version's task {@code fromCarePlanNodeId} already called for. */
	public record CarriedSlot(Long fromCarePlanId, Long fromCarePlanNodeId, VisitSlot to) {
	}
}
