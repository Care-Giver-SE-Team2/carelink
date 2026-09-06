package sg.nus.carelink.rostering.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Domain model for absence_report.
 *
 * <p>Generated starting point: the same fields as the table, and nothing else. This is
 * where the business rules and the design patterns go — reshape it into a proper
 * aggregate (add behaviour, fold child tables in, drop columns the domain does not
 * care about). identity.domain.model.AppUser is the template. Must not import JPA or
 * Spring Data; ArchUnit rejects the build if it does.
 */
public record AbsenceReport(
		Long id,
		Long caregiverId,
		Long reviewedByUserId,
		AbsenceReport.Type type,
		LocalDate startDate,
		LocalDate endDate,
		String reason,
		AbsenceReport.Status status,
		LocalDateTime createdAt,
		LocalDateTime updatedAt) {

	public enum Type {
		SICK, ANNUAL, EMERGENCY, OTHER
	}

	public enum Status {
		PENDING, APPROVED, REJECTED
	}
}
