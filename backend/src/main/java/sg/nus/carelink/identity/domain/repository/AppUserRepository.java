package sg.nus.carelink.identity.domain.repository;

import sg.nus.carelink.identity.domain.model.AppUser;

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
	 * Stores a new account and returns it with its id. The password hash is passed straight
	 * through to storage; AppUser never holds it.
	 */
	default AppUser add(AppUser user, String passwordHash) {
		return add(user, passwordHash, null);
	}

	/**
	 * Stores a new account whose password was generated rather than chosen, keeping a readable
	 * copy of it ({@code temporaryPassword}) until the person replaces it. Null for a chosen one.
	 */
	AppUser add(AppUser user, String passwordHash, String temporaryPassword);

	/** The issued temporary password, while the account still has it; empty once replaced. */
	Optional<String> findTemporaryPassword(Long id);

	/** Stores the hash of a password the person chose and drops any temporary password. */
	void replacePassword(Long id, String passwordHash);
}
