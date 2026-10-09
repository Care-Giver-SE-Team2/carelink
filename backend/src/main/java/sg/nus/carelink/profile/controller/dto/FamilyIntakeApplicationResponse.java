package sg.nus.carelink.profile.controller.dto;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import sg.nus.carelink.profile.application.PendingElderLogin;
import sg.nus.carelink.profile.domain.model.IntakeApplication;
import sg.nus.carelink.profile.domain.model.IntakeApplication.MobilityLevel;
import sg.nus.carelink.profile.domain.model.IntakeApplication.Status;

/**
 * Holds the application details visible to a family member. {@code elderLogin} is set only on the
 * detail view of an approved application while the elder still has the temporary password, and is
 * left out of the JSON otherwise.
 *
 * @author Wang Zhili
 */
public record FamilyIntakeApplicationResponse(
		Long id, Long applicantFamilyMemberId, String targetElderName, Integer targetElderAge,
		String targetAddress, String postalCode, MobilityLevel mobilityLevel, String preferredDialects,
		List<String> careNeeds, String medicalNotes, Status status, String reviewRemarks,
		OffsetDateTime createdAt, OffsetDateTime reviewedAt, Long elderId,
		@JsonInclude(JsonInclude.Include.NON_NULL) PendingElderLogin elderLogin) {

	/**
	 * Map an application to family-visible details with explicit UTC offsets.
	 *
	 * @param application Application whose stored timestamps use UTC
	 * @return Family response containing the application details and review status
	 *
	 * @author Wang Zhili
	 */
	public static FamilyIntakeApplicationResponse from(IntakeApplication application) {
		return from(application, null);
	}

	/**
	 * Map an application and, while the elder still has the temporary password, the elder's login.
	 *
	 * @param application Application whose stored timestamps use UTC
	 * @param elderLogin The elder's login, or null to leave it out
	 * @return Family response containing the application details, review status and elder login
	 */
	public static FamilyIntakeApplicationResponse from(IntakeApplication application, PendingElderLogin elderLogin) {
		return new FamilyIntakeApplicationResponse(application.id(), application.applicantFamilyMemberId(),
				application.targetElderName(), application.targetElderAge(), application.targetAddress(),
				application.postalCode(), application.mobilityLevel(), application.preferredDialects(),
				application.careNeeds(), application.medicalNotes(), application.status(), application.reviewRemarks(),
				utc(application.createdAt()), utc(application.reviewedAt()), application.elderId(), elderLogin);
	}

	private static OffsetDateTime utc(LocalDateTime time) {
		return time == null ? null : time.atOffset(ZoneOffset.UTC);
	}
}
