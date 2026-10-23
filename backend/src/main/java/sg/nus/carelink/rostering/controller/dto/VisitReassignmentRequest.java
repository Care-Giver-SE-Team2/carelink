package sg.nus.carelink.rostering.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/visits/{visitId}/reassignment}: who the manager gives the visit to,
 * and why. The reason is kept in the visit's history, so it is short enough to fit there.
 */
public record VisitReassignmentRequest(
		@NotNull(message = "caregiverId is required")
		Long caregiverId,

		@NotBlank(message = "reason is required")
		@Size(max = 150, message = "reason must be at most 150 characters")
		String reason) {
}
