package sg.nus.carelink.visit.domain.model;

import java.time.LocalDateTime;

/**
 * Domain model for visit.
 *
 * <p>Generated starting point: the same fields as the table, and nothing else. This is
 * where the business rules and the design patterns go — reshape it into a proper
 * aggregate (add behaviour, fold child tables in, drop columns the domain does not
 * care about). identity.domain.model.AppUser is the template. Must not import JPA or
 * Spring Data; ArchUnit rejects the build if it does.
 */
public record Visit(
		Long id,
		Long elderId,
		Long caregiverId,
		Long carePlanNodeId,
		Long absenceId,
		String serviceType,
		LocalDateTime scheduledStart,
		LocalDateTime scheduledEnd,
		LocalDateTime checkedInAt,
		LocalDateTime checkedOutAt,
		Visit.Status status,
		LocalDateTime stateDeadline,
		Long carePlanId,
		Integer version,
		LocalDateTime createdAt,
		LocalDateTime updatedAt) {

	/**
	 * A new visit generated from a care plan task (UC-MG03): SCHEDULED, not yet versioned, and
	 * with no state deadline, which is set by whoever owns the missed-check-in rule (SYS03).
	 * {@code caregiverId} may be null, leaving the visit to be covered.
	 */
	public static Visit scheduled(Long elderId, Long caregiverId, Long carePlanId, Long carePlanNodeId,
			String serviceType, LocalDateTime start, LocalDateTime end) {
		java.util.Objects.requireNonNull(elderId, "elderId");
		java.util.Objects.requireNonNull(start, "start");
		if (end != null && !end.isAfter(start)) {
			throw new IllegalArgumentException("A visit must end after it starts: " + start + " to " + end);
		}
		return new Visit(null, elderId, caregiverId, carePlanNodeId, null, serviceType, start, end,
				null, null, Status.SCHEDULED, null, carePlanId, null, null, null);
	}

	/**
	 * True while nobody has started on the visit, so it may still be reassigned or called off.
	 * Not named isX: controllers serialise this record as-is, and Jackson would add an isX()
	 * method to the JSON as a property.
	 */
	public boolean hasNotStarted() {
		return status == Status.SCHEDULED;
	}

	/** Gives an unassigned, untouched visit to a caregiver. */
	public Visit coveredBy(Long newCaregiverId) {
		if (!hasNotStarted() || caregiverId != null) {
			throw new IllegalStateException("Visit " + id + " is already " + (caregiverId != null ? "assigned" : status));
		}
		return withAssignmentAndStatus(newCaregiverId, status);
	}

	/** Calls off a visit nobody has started, e.g. because its care plan changed or stopped. */
	public Visit cancelled() {
		if (!hasNotStarted()) {
			throw new IllegalStateException("Visit " + id + " is " + status + " and can no longer be cancelled");
		}
		return withAssignmentAndStatus(caregiverId, Status.CANCELLED);
	}

	/**
	 * Turns a visit that reached its start time with nobody assigned into an exception: nobody
	 * can check in to it, so it needs a manager now, not a caregiver later.
	 */
	public Visit uncoveredAtStart() {
		if (!hasNotStarted() || caregiverId != null) {
			throw new IllegalStateException("Visit " + id + " is " + (caregiverId != null ? "assigned" : status));
		}
		return withAssignmentAndStatus(null, Status.EXCEPTION);
	}

	private Visit withAssignmentAndStatus(Long newCaregiverId, Status newStatus) {
		return new Visit(id, elderId, newCaregiverId, carePlanNodeId, absenceId, serviceType, scheduledStart,
				scheduledEnd, checkedInAt, checkedOutAt, newStatus, stateDeadline, carePlanId, version,
				createdAt, updatedAt);
	}

	public enum Status {
		SCHEDULED, ARRIVED, IN_PROGRESS, COMPLETED, VERIFIED, AUTO_CLOSED, EXCEPTION, CANCELLED
	}
}
