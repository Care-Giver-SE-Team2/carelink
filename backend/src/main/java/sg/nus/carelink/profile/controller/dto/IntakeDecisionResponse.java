package sg.nus.carelink.profile.controller.dto;

import sg.nus.carelink.profile.domain.model.IntakeApplication;

/** The answered application: its new status and, once approved, the elder record created from it. */
public record IntakeDecisionResponse(Long id, IntakeApplication.Status status, Long elderId) {

	public static IntakeDecisionResponse from(IntakeApplication application) {
		return new IntakeDecisionResponse(application.id(), application.status(), application.elderId());
	}
}
