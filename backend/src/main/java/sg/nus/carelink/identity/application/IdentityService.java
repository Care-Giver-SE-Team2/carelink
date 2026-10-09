package sg.nus.carelink.identity.application;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.identity.domain.repository.AppUserRepository;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.error.ResourceNotFound;

/**
 * Use-case orchestration for authentication.
 *
 * <p>Note this is an ordinary class with no matching {@code IdentityServiceImpl}.
 * A service with a single implementation that no other module calls does not need
 * an interface. Interfaces appear in exactly four situations — see ARCHITECTURE.md.
 */
@Service
public class IdentityService {

	private final AuthenticationManager authenticationManager;
	private final AppUserRepository users;
	private final PasswordEncoder passwordEncoder;

	IdentityService(AuthenticationManager authenticationManager, AppUserRepository users,
			PasswordEncoder passwordEncoder) {
		this.authenticationManager = authenticationManager;
		this.users = users;
		this.passwordEncoder = passwordEncoder;
	}

	/** Verifies credentials. Returns an authenticated token, or throws AuthenticationException. */
	public Authentication authenticate(String username, String rawPassword) {
		return authenticationManager.authenticate(
				UsernamePasswordAuthenticationToken.unauthenticated(username, rawPassword));
	}

	public AppUser require(String username) {
		return users.findByUsername(username)
				.orElseThrow(() -> new ResourceNotFound("Account", username));
	}

	/** True while the account still signs in with the temporary password it was issued. */
	@Transactional(readOnly = true)
	public boolean passwordChangeRequired(AppUser user) {
		return users.findTemporaryPassword(user.id()).isPresent();
	}

	/**
	 * Replaces an issued temporary password with one the person chose, which also removes the
	 * temporary one from where the family could read it. Only allowed while the temporary password
	 * is still in place: the signed-in session already proved it, so it isn't asked for again.
	 * Changing a password the person chose is a separate use case (it would ask for the current one).
	 *
	 * @throws BusinessRuleViolation PASSWORD_ALREADY_CHOSEN if there is no temporary password to
	 *         replace; SAME_AS_TEMPORARY_PASSWORD if the new one is the temporary one
	 */
	@Transactional
	public AppUser chooseOwnPassword(String username, String newPassword) {
		AppUser user = require(username);
		String temporaryPassword = users.findTemporaryPassword(user.id())
				.orElseThrow(() -> new BusinessRuleViolation("PASSWORD_ALREADY_CHOSEN",
						"This account's password has already been chosen"));
		if (temporaryPassword.equals(newPassword)) {
			throw new BusinessRuleViolation("SAME_AS_TEMPORARY_PASSWORD",
					"Choose a password different from the temporary one");
		}
		users.replacePassword(user.id(), passwordEncoder.encode(newPassword));
		return user;
	}
}
