package sg.nus.carelink.rostering.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import sg.nus.carelink.identity.application.IdentityService;
import sg.nus.carelink.rostering.application.ManagerReassignmentService;
import sg.nus.carelink.rostering.controller.dto.ReassignmentOptionResponse;
import sg.nus.carelink.rostering.controller.dto.VisitCancellationRequest;
import sg.nus.carelink.rostering.controller.dto.VisitReassignmentRequest;

/**
 * HTTP for a manager giving any visit that has not started to another caregiver, or cancelling
 * it. Presentation only: 409 when a rule stops it (the visit has started, the caregiver fails a
 * hard rule, an absence still answers for it),
 * 404 for a missing visit or caregiver, 403 for the wrong role, 400 for a malformed body.
 */
@RestController
@RequestMapping("/api/visits/{visitId}")
public class VisitReassignmentController {

	private final ManagerReassignmentService reassignments;
	private final IdentityService identity;

	public VisitReassignmentController(ManagerReassignmentService reassignments, IdentityService identity) {
		this.reassignments = reassignments;
		this.identity = identity;
	}

	/** Who could take the visit instead, best first, then who cannot and why. */
	@GetMapping("/reassignment-options")
	@PreAuthorize("hasRole('MANAGER')")
	public List<ReassignmentOptionResponse> options(@PathVariable Long visitId) {
		return reassignments.options(visitId).stream().map(ReassignmentOptionResponse::from).toList();
	}

	/** The manager gives the visit to the caregiver they chose. */
	@PostMapping("/reassignment")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasRole('MANAGER')")
	public void reassign(@PathVariable Long visitId, @Valid @RequestBody VisitReassignmentRequest body,
			Principal principal) {
		reassignments.reassign(visitId, body.caregiverId(), body.reason(),
				identity.require(principal.getName()).id());
	}

	/** The manager cancels the visit; the care plan, and so every later visit, is unchanged. */
	@PostMapping("/cancellation")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasRole('MANAGER')")
	public void cancel(@PathVariable Long visitId, @Valid @RequestBody VisitCancellationRequest body,
			Principal principal) {
		reassignments.cancel(visitId, body.reason(), identity.require(principal.getName()).id());
	}
}
