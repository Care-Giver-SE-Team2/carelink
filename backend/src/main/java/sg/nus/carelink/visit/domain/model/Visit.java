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

	public enum Status {
		SCHEDULED, ARRIVED, IN_PROGRESS, COMPLETED, VERIFIED, AUTO_CLOSED, EXCEPTION, CANCELLED
	}
}
