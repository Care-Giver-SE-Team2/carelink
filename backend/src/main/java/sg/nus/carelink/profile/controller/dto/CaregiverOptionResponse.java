package sg.nus.carelink.profile.controller.dto;

import sg.nus.carelink.profile.domain.model.Caregiver;

/**
 * One row of the manager's caregiver picker. assignable is Caregiver.isAssignable(), so the
 * client never re-derives the rule from status.
 */
public record CaregiverOptionResponse(
		Long id,
		String fullName,
		String sector,
		Caregiver.Status status,
		boolean assignable) {

	public static CaregiverOptionResponse from(Caregiver caregiver) {
		return new CaregiverOptionResponse(
				caregiver.id(),
				caregiver.fullName(),
				caregiver.sector(),
				caregiver.status(),
				caregiver.isAssignable());
	}
}
