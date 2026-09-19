package sg.nus.carelink.profile.domain.model;

import java.time.LocalDateTime;
import java.util.List;

/**
 * An intake application is the family's submitted statement, separate from an approved elder profile.
 * Submission starts in SUBMITTED; approval and review transitions belong to the manager use case.
 * The canonical constructor also reconstitutes existing applications from storage.
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

	/** Create the submission only. Storage assigns the identifier and creation time. */
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
