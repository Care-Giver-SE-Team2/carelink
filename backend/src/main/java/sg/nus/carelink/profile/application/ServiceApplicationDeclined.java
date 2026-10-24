package sg.nus.carelink.profile.application;

/**
 * Published after a manager declines a service application, so the family member who applied is
 * told, with the reason. partlyPlanned is true when some of what it asked for was already in the
 * care plan, so the family isn't told none of it was added. Listened for after the decline commits.
 */
public record ServiceApplicationDeclined(Long applicationId, Long elderId, Long applicantFamilyMemberId,
		String reason, boolean partlyPlanned) {
}
