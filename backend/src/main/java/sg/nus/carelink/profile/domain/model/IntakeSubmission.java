package sg.nus.carelink.profile.domain.model;

import java.util.List;

/** Family-supplied application details. Ownership, review fields and timestamps are server-owned. */
public record IntakeSubmission(
		String targetElderName,
		Integer targetElderAge,
		String targetAddress,
		String postalCode,
		IntakeApplication.MobilityLevel mobilityLevel,
		String preferredDialects,
		List<String> careNeeds,
		String medicalNotes) {

	public IntakeSubmission {
		targetElderName = requiredText(targetElderName, "targetElderName");
		targetAddress = requiredText(targetAddress, "targetAddress");
		postalCode = requiredText(postalCode, "postalCode");
		mobilityLevel = mobilityLevel == null ? IntakeApplication.MobilityLevel.INDEPENDENT : mobilityLevel;
		careNeeds = careNeeds == null ? List.of() : List.copyOf(careNeeds);
	}

	private static String requiredText(String value, String field) {
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException(field + " must not be blank");
		}
		return value.strip();
	}
}
