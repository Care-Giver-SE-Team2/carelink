package sg.nus.carelink.profile.controller;

import java.security.Principal;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.carelink.profile.application.IntakeSubmissionService;
import sg.nus.carelink.profile.controller.dto.FamilyIntakeApplicationResponse;
import sg.nus.carelink.profile.controller.dto.IntakeApplicationCreateRequest;

/**
 * Exposes the family intake submission endpoint.
 *
 * @author Wang Zhili
 */
@RestController
@RequestMapping("/api/intake-applications")
public class IntakeApplicationController {

	private final IntakeSubmissionService submissions;

	public IntakeApplicationController(IntakeSubmissionService submissions) {
		this.submissions = submissions;
	}

	/**
	 * Create a SUBMITTED intake application for the logged-in family member.
	 *
	 * @param request Elder details and care needs supplied by the family
	 * @param principal Logged-in account supplied by Spring Security
	 * @return Saved application details with HTTP 201, including the identifier and creation time
	 *
	 * @author Wang Zhili
	 */
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasRole('FAMILY')")
	public FamilyIntakeApplicationResponse submit(@Valid @RequestBody IntakeApplicationCreateRequest request,
			Principal principal) {
		return FamilyIntakeApplicationResponse.from(submissions.submit(principal.getName(), request.toSubmission()));
	}
}
