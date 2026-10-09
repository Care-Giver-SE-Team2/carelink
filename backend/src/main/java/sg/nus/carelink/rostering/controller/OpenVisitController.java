package sg.nus.carelink.rostering.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import sg.nus.carelink.identity.application.IdentityService;
import sg.nus.carelink.rostering.application.OpenVisitService;
import sg.nus.carelink.rostering.controller.dto.OpenVisitDtos;
import sg.nus.carelink.rostering.domain.service.Shortlist;

/**
 * HTTP for UC-MG03 on a visit nobody holds: who can take it, and the manager's pick.
 *
 * <p>Presentation only. 409 when the visit is no longer open or the rules exclude the pick, 404
 * for a missing visit or a caregiver the search did not consider.
 */
@RestController
@RequestMapping("/api/open-visits")
public class OpenVisitController {

	private final OpenVisitService openVisits;
	private final IdentityService identity;

	public OpenVisitController(OpenVisitService openVisits, IdentityService identity) {
		this.openVisits = openVisits;
		this.identity = identity;
	}

	/** Who can take the visit, best first, then who cannot and why. */
	@GetMapping("/{visitId}/candidates")
	@PreAuthorize("hasRole('MANAGER')")
	public List<OpenVisitDtos.Candidate> candidates(@PathVariable Long visitId) {
		return openVisits.candidates(visitId).stream().map(OpenVisitDtos.Candidate::of).toList();
	}

	/** The manager puts a caregiver on the visit. */
	@PostMapping("/{visitId}/assignment")
	@PreAuthorize("hasRole('MANAGER')")
	public OpenVisitDtos.Assigned assign(@PathVariable Long visitId,
			@Valid @RequestBody OpenVisitDtos.Assignment body, Principal principal) {
		Long managerId = identity.require(principal.getName()).id();
		Shortlist.Verdict chosen = openVisits.assign(visitId, body.caregiverId(), managerId);
		return new OpenVisitDtos.Assigned(visitId, chosen.caregiverId(), chosen.name());
	}
}
