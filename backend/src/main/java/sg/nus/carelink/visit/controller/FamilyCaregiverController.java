package sg.nus.carelink.visit.controller;

import java.security.Principal;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.carelink.visit.application.FamilyCaregiverQueryService;
import sg.nus.carelink.visit.controller.dto.FamilyCaregiverResponse;

/**
 * Exposes caregiver public profiles to authorized family members.
 *
 * @author Wang Zhili
 */
@RestController
@RequestMapping("/api/caregivers")
public class FamilyCaregiverController {

	private final FamilyCaregiverQueryService queries;

	public FamilyCaregiverController(FamilyCaregiverQueryService queries) {
		this.queries = queries;
	}

	/**
	 * Gets public details after checking the family's current caregiver relationship.
	 *
	 * @param caregiverId Caregiver profile identifier from the request path
	 * @param principal Account supplied by the authenticated session
	 * @return Caregiver identifier, name and languages
	 * @author Wang Zhili
	 */
	@GetMapping("/{caregiverId}")
	@PreAuthorize("hasRole('FAMILY')")
	public FamilyCaregiverResponse get(@PathVariable Long caregiverId, Principal principal) {
		return FamilyCaregiverResponse.from(queries.getProfile(principal.getName(), caregiverId));
	}
}
