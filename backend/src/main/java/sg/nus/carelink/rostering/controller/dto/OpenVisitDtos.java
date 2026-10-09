package sg.nus.carelink.rostering.controller.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

import sg.nus.carelink.rostering.domain.service.Shortlist;

/** Request and response bodies of UC-MG03's open-visit assignment. Shape only; the rules are in the domain. */
public final class OpenVisitDtos {

	private OpenVisitDtos() {
	}

	/** Body of {@code POST /api/open-visits/{visitId}/assignment}: who the manager picked. */
	public record Assignment(
			@NotNull(message = "caregiverId is required")
			Long caregiverId) {
	}

	/**
	 * One caregiver the search considered.
	 *
	 * @param rank 1 for the best suggestion; null when a rule excluded them
	 * @param reason why they rank where they do, or the rule that excluded them
	 * @param excludedBy the code of that rule; null when they can take the visit
	 */
	public record Candidate(Long caregiverId, String name, Integer rank, BigDecimal score, String reason,
			String excludedBy) {

		public static Candidate of(Shortlist.Verdict verdict) {
			return new Candidate(verdict.caregiverId(), verdict.name(), verdict.rank(), verdict.score(),
					verdict.reason(), verdict.excludedBy());
		}
	}

	/** Who is now on the visit. */
	public record Assigned(Long visitId, Long caregiverId, String caregiverName) {
	}
}
