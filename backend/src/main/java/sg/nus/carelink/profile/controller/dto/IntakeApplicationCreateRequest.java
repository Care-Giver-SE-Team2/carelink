package sg.nus.carelink.profile.controller.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.UniqueElements;
import tools.jackson.databind.annotation.JsonDeserialize;

import sg.nus.carelink.profile.domain.model.IntakeApplication.MobilityLevel;
import sg.nus.carelink.profile.domain.model.IntakeSubmission;

/**
 * Accepts the family-editable fields of an intake application.
 *
 * @author Wang Zhili
 */
@JsonDeserialize(using = IntakeApplicationCreateRequestDeserializer.class)
public record IntakeApplicationCreateRequest(
		@NotBlank @Size(max = 100) String targetElderName,
		@PositiveOrZero Integer targetElderAge,
		@NotBlank @Size(max = 255) String targetAddress,
		@NotBlank @Size(max = 10) String postalCode,
		MobilityLevel mobilityLevel,
		@Size(max = 100) String preferredDialects,
		@UniqueElements List<@NotNull @Size(min = 1) String> careNeeds,
		String medicalNotes) {

	public IntakeApplicationCreateRequest {
		targetElderName = strip(targetElderName);
		targetAddress = strip(targetAddress);
		postalCode = strip(postalCode);
	}

	private static String strip(String value) {
		return value == null ? null : value.strip();
	}

	public IntakeSubmission toSubmission() {
		return new IntakeSubmission(targetElderName, targetElderAge, targetAddress, postalCode,
				mobilityLevel, preferredDialects, careNeeds, medicalNotes);
	}
}
