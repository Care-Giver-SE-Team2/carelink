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

/** FM01 submission only; managers own review, approval and elder provisioning. */
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

	/** The username must come from the authenticated principal, never the request body. */
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
