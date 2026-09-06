package sg.nus.carelink.incident.domain.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Domain model for incident.
 *
 * <p>Generated starting point: the same fields as the table, and nothing else. This is
 * where the business rules and the design patterns go — reshape it into a proper
 * aggregate (add behaviour, fold child tables in, drop columns the domain does not
 * care about). identity.domain.model.AppUser is the template. Must not import JPA or
 * Spring Data; ArchUnit rejects the build if it does.
 */
public record Incident(
		Long id,
		Long elderId,
		Long visitId,
		Long reportedByUserId,
		Long responderUserId,
		Incident.Source source,
		Incident.Category category,
		Incident.Severity severity,
		Incident.Status status,
		BigDecimal latitude,
		BigDecimal longitude,
		String locationText,
		String description,
		LocalDateTime respondBy,
		LocalDateTime reportedAt,
		LocalDateTime resolvedAt) {

	public enum Source {
		CAREGIVER, ELDER_SOS, SYSTEM_MISSED_CHECKIN
	}

	public enum Category {
		SOS, MEDICAL, FALL, SERVICE, OTHER
	}

	public enum Severity {
		LOW, MEDIUM, HIGH
	}

	public enum Status {
		OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, UNRESOLVED_ESCALATED
	}
}
