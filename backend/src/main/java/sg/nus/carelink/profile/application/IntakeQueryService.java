package sg.nus.carelink.profile.application;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.identity.application.UserDirectory;
import sg.nus.carelink.profile.domain.model.IntakeApplication;
import sg.nus.carelink.profile.domain.model.IntakeApplicationPage;
import sg.nus.carelink.profile.domain.repository.FamilyMemberRepository;
import sg.nus.carelink.profile.domain.repository.IntakeApplicationRepository;
import sg.nus.carelink.shared.security.Role;

/**
 * Retrieves intake applications owned by the current family member.
 *
 * @author Wang Zhili
 */
@Service
public class IntakeQueryService {

	private final UserDirectory users;
	private final FamilyMemberRepository families;
	private final IntakeApplicationRepository applications;

	public IntakeQueryService(UserDirectory users, FamilyMemberRepository families,
			IntakeApplicationRepository applications) {
		this.users = users;
		this.families = families;
		this.applications = applications;
	}

	/**
	 * List the current family's applications, newest first, after checking current account access.
	 *
	 * @param authenticatedUsername Username supplied by the authenticated principal
	 * @param status Optional application status; null includes all statuses
	 * @param page Zero-based page number
	 * @param size Number of applications per page
	 * @return The family's page and total count after status filtering
	 * @throws AccessDeniedException If the account lacks current FAMILY access or a family profile
	 *
	 * @author Wang Zhili
	 */
	@Transactional(readOnly = true)
	public IntakeApplicationPage listMine(String authenticatedUsername, IntakeApplication.Status status,
			int page, int size) {
		if (authenticatedUsername == null || authenticatedUsername.isBlank()) {
			throw new AccessDeniedException("An authenticated family account is required");
		}
		var user = users.findByUsername(authenticatedUsername)
				.filter(account -> account.enabled() && account.hasRole(Role.FAMILY))
				.orElseThrow(() -> new AccessDeniedException("A family account is required to list applications"));
		var family = families.findByUserId(user.id())
				.orElseThrow(() -> new AccessDeniedException("A family profile is required to list applications"));
		return applications.findForApplicant(family.id(), status, page, size);
	}
}
