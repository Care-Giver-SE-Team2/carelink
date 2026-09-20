package sg.nus.carelink.careplan.controller.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** One scheduled day for a TASK node, e.g. {"day": "Mon", "minutes": 30}. */
public record VisitRequest(@NotBlank String day, @NotNull @Min(1) Integer minutes) {
}
