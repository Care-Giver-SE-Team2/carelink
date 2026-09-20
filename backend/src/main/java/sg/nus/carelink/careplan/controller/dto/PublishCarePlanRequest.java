package sg.nus.carelink.careplan.controller.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/** The whole tree the manager built in the editor, snapshotted at the moment they publish. */
public record PublishCarePlanRequest(@NotEmpty @Valid List<PlanNodeRequest> nodes) {
}
