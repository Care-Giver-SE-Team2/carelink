package sg.nus.carelink.identity.application;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.identity.domain.repository.AppUserRepository;
import sg.nus.carelink.shared.error.ResourceNotFound;
import sg.nus.carelink.shared.security.Role;

import java.util.List;
import java.util.Optional;

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

	IdentityService(AuthenticationManager authenticationManager, AppUserRepository users) {
		this.authenticationManager = authenticationManager;
		this.users = users;
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

	public Optional<AppUser> findById(Long id) {
		return users.findById(id);
	}

	/**
	 * Every enabled account holding this role.
	 *
	 * <p>Exposed for other modules: the incident module's escalation chain needs to know who
	 * the managers are, and reaching into user_role from there would duplicate this mapping.
	 */
	public List<AppUser> enabledWithRole(Role role) {
		return users.findEnabledByRole(role);
	}
}
