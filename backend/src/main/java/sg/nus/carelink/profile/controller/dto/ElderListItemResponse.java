package sg.nus.carelink.profile.controller.dto;

import java.time.LocalDate;

import sg.nus.carelink.profile.application.ElderSummary;

/** Row shape for the Elders index (UC-MG01 step one): the elder plus its plan status. */
public record ElderListItemResponse(
		Long id,
		String fullName,
		LocalDate dateOfBirth,
		String address,
		String sector,
		String planStatus,
		Integer planVersion) {

	public static ElderListItemResponse from(ElderSummary summary) {
		return new ElderListItemResponse(
				summary.elder().id(),
				summary.elder().fullName(),
				summary.elder().dateOfBirth(),
				summary.elder().address(),
				summary.elder().sector(),
				summary.planStatus(),
				summary.planVersion());
	}
}
