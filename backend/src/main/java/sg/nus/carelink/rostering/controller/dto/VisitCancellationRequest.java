package sg.nus.carelink.rostering.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/visits/{visitId}/cancellation}: why the manager is cancelling the
 * visit. The reason is kept in the visit's history, so it is short enough to fit there.
 */
public record VisitCancellationRequest(
		@NotBlank(message = "reason is required")
		@Size(max = 150, message = "reason must be at most 150 characters")
		String reason) {
}
