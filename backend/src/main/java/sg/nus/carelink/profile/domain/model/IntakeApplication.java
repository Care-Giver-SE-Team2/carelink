package sg.nus.carelink.profile.domain.model;

import java.time.LocalDateTime;

/**
 * Domain model for intake_application.
 *
 * <p>Generated starting point: the same fields as the table, and nothing else. This is
 * where the business rules and the design patterns go — reshape it into a proper
 * aggregate (add behaviour, fold child tables in, drop columns the domain does not
 * care about). identity.domain.model.AppUser is the template. Must not import JPA or
 * Spring Data; ArchUnit rejects the build if it does.
 */
public record IntakeApplication(
		Long id,
		Long applicantFamilyMemberId,
		String targetElderName,
		Integer targetElderAge,
		String targetAddress,
		String postalCode,
		IntakeApplication.MobilityLevel mobilityLevel,
		String preferredDialects,
		String careNeeds,
		String medicalNotes,
		IntakeApplication.Status status,
		Long reviewedByUserId,
		String reviewRemarks,
		LocalDateTime createdAt,
		LocalDateTime reviewedAt,
		Long elderId) {

	public enum MobilityLevel {
		INDEPENDENT, ASSISTIVE_CANE, WHEELCHAIR_BEDBOUND
	}

	public enum Status {
		SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED
	}
}
