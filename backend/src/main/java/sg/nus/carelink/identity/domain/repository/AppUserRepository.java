package sg.nus.carelink.identity.domain.repository;

import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.shared.security.Role;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface. The domain layer declares what it needs; the implementation
 * lives in infrastructure.persistence. This is dependency inversion.
 *
 * <p>It is precisely why the domain layer can be unit tested without a database:
 * a test supplies a hand-written fake implementation.
 */
public interface AppUserRepository {

	Optional<AppUser> findByUsername(String username);

	Optional<AppUser> findById(Long id);

	/**
	 * Every enabled account holding this role, ordered by display name so the answer is
	 * stable between calls. Added for the incident module's escalation chain, which has to
	 * know who the managers are before it can decide who to hand an incident to.
	 */
	List<AppUser> findEnabledByRole(Role role);
}
