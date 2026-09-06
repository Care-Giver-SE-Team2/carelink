package sg.nus.carelink.report.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Domain model for report.
 *
 * <p>Generated starting point: the same fields as the table, and nothing else. This is
 * where the business rules and the design patterns go — reshape it into a proper
 * aggregate (add behaviour, fold child tables in, drop columns the domain does not
 * care about). identity.domain.model.AppUser is the template. Must not import JPA or
 * Spring Data; ArchUnit rejects the build if it does.
 */
public record Report(
		Long id,
		Long elderId,
		Long generatedByUserId,
		Report.Audience audience,
		LocalDate periodStart,
		LocalDate periodEnd,
		Report.Status status,
		String content,
		LocalDateTime createdAt) {

	public enum Audience {
		FAMILY, REGULATOR, INTERNAL
	}

	public enum Status {
		DRAFT, PUBLISHED, ARCHIVED
	}
}
