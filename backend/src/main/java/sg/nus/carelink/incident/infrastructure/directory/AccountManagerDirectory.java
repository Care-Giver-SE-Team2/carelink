package sg.nus.carelink.incident.infrastructure.directory;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import sg.nus.carelink.identity.application.IdentityService;
import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.incident.domain.model.Responder;
import sg.nus.carelink.incident.domain.repository.ManagerDirectory;
import sg.nus.carelink.shared.security.Role;

/**
 * Answers "who can take an incident" from the accounts that exist.
 *
 * <p>Goes through {@link IdentityService} rather than reading {@code user_role} itself, so
 * the mapping from a row to an account lives in one module. The incident module asks a
 * question and does not learn how accounts are stored.
 *
 * <p>There is no notion of a shift here on purpose. CareLink does not roster its managers,
 * so every enabled manager is reachable and the chain distinguishes them by who knows the
 * elder rather than by who is nominally on call.
 */
@Component
class AccountManagerDirectory implements ManagerDirectory {

	private final IdentityService identity;

	AccountManagerDirectory(IdentityService identity) {
		this.identity = identity;
	}

	@Override
	public List<Responder> allManagers() {
		return identity.enabledWithRole(Role.MANAGER).stream()
				.map(AccountManagerDirectory::toResponder)
				.toList();
	}

	@Override
	public Optional<Responder> responderById(Long userId) {
		if (userId == null) {
			return Optional.empty();
		}
		return identity.findById(userId).map(AccountManagerDirectory::toResponder);
	}

	private static Responder toResponder(AppUser user) {
		return new Responder(user.id(), user.displayName());
	}
}
