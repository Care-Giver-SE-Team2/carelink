package sg.nus.carelink.rostering.controller.dto;

import sg.nus.carelink.rostering.application.VisitCover;

/**
 * One caregiver in the picker for reassigning a visit.
 *
 * @param rank 1 for the best suggestion; null when a hard rule excludes them
 * @param reason why they are suggested, or what excludes them
 */
public record ReassignmentOptionResponse(Long caregiverId, String name, Integer rank, String reason,
		boolean eligible) {

	public static ReassignmentOptionResponse from(VisitCover.Option option) {
		return new ReassignmentOptionResponse(option.caregiverId(), option.name(), option.rank(), option.reason(),
				option.eligible());
	}
}
