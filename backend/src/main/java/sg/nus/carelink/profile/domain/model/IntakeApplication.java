package sg.nus.carelink.profile.domain.model;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Represents a family's intake application and its review status.
 *
 * @author Wang Zhili
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
		List<String> careNeeds,
		String medicalNotes,
		IntakeApplication.Status status,
		Long reviewedByUserId,
		String reviewRemarks,
		LocalDateTime createdAt,
		LocalDateTime reviewedAt,
		Long elderId) {

	public IntakeApplication {
		careNeeds = careNeeds == null ? List.of() : List.copyOf(careNeeds);
	}

	/**
	 * Create a SUBMITTED application with empty review fields and no linked elder.
	 *
	 * @param applicantFamilyMemberId Family profile identifier resolved from the authenticated account
	 * @param details Validated application details supplied by the family
	 * @return A new application whose identifier and creation time will be assigned by storage
	 * @throws IllegalArgumentException If the family profile identifier is null or not positive
	 *
	 * @author Wang Zhili
	 */
	public static IntakeApplication submit(Long applicantFamilyMemberId, IntakeSubmission details) {
		if (applicantFamilyMemberId == null || applicantFamilyMemberId <= 0) {
			throw new IllegalArgumentException("applicantFamilyMemberId must be positive");
		}
		return new IntakeApplication(null, applicantFamilyMemberId, details.targetElderName(),
				details.targetElderAge(), details.targetAddress(), details.postalCode(), details.mobilityLevel(),
				details.preferredDialects(), details.careNeeds(), details.medicalNotes(),
				Status.SUBMITTED, null, null, null, null, null);
	}

	public enum MobilityLevel {
		INDEPENDENT, ASSISTIVE_CANE, WHEELCHAIR_BEDBOUND
	}

	public enum Status {
		SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED
	}
}
