package sg.nus.carelink.profile.application;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.identity.application.UserDirectory;
import sg.nus.carelink.profile.domain.model.IntakeApplication;
import sg.nus.carelink.profile.domain.model.IntakeSubmission;
import sg.nus.carelink.profile.domain.repository.FamilyMemberRepository;
import sg.nus.carelink.profile.domain.repository.IntakeApplicationRepository;
import sg.nus.carelink.shared.security.Role;

/**
 * Coordinates intake submission for the current family member.
 *
 * @author Wang Zhili
 */
@Service
public class IntakeSubmissionService {

	private final UserDirectory users;
	private final FamilyMemberRepository families;
	private final IntakeApplicationRepository applications;

	public IntakeSubmissionService(UserDirectory users, FamilyMemberRepository families,
			IntakeApplicationRepository applications) {
		this.users = users;
		this.families = families;
		this.applications = applications;
	}

	/**
	 * Save a new intake application for the family linked to the authenticated account.
	 *
	 * @param authenticatedUsername Username from the authenticated principal, never the request body
	 * @param details Validated application details supplied by the family
	 * @return The saved application, including its generated identifier and creation time
	 * @throws AccessDeniedException If the account is unavailable, disabled, lacks FAMILY access or has no family profile
	 *
	 * @author Wang Zhili
	 */
	@Transactional
	public IntakeApplication submit(String authenticatedUsername, IntakeSubmission details) {
		if (authenticatedUsername == null || authenticatedUsername.isBlank()) {
			throw new AccessDeniedException("An authenticated family account is required");
		}
		var user = users.findByUsername(authenticatedUsername)
				.filter(account -> account.enabled() && account.hasRole(Role.FAMILY))
				.orElseThrow(() -> new AccessDeniedException("A family account is required to submit an application"));
		var family = families.findByUserId(user.id())
				.orElseThrow(() -> new AccessDeniedException("A family profile is required to submit an application"));
		return applications.save(IntakeApplication.submit(family.id(), details));
	}
}
