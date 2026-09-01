package sg.nus.carelink.identity.domain.model;

import sg.nus.carelink.shared.security.Role;

import java.util.Collections;
import java.util.Objects;
import java.util.Set;

/**
 * Domain model of an account.
 *
 * <p>It deliberately holds no password hash: a password is an implementation detail
 * of the authentication mechanism and belongs in infrastructure. The domain layer
 * only cares who this is and what they are allowed to do.
 *
 * <p>No framework annotations, so this class can simply be instantiated in a test.
 */
public final class AppUser {

	private final Long id;
	private final String username;
	private final String displayName;
	private final Set<Role> roles;
	private final boolean enabled;

	public AppUser(Long id, String username, String displayName, Set<Role> roles, boolean enabled) {
		this.id = id;
		this.username = Objects.requireNonNull(username, "username");
		this.displayName = Objects.requireNonNull(displayName, "displayName");
		this.roles = Set.copyOf(Objects.requireNonNull(roles, "roles"));
		this.enabled = enabled;
	}

	public Long id() {
		return id;
	}

	public String username() {
		return username;
	}

	public String displayName() {
		return displayName;
	}

	public Set<Role> roles() {
		return Collections.unmodifiableSet(roles);
	}

	public boolean enabled() {
		return enabled;
	}

	public boolean hasRole(Role role) {
		return roles.contains(role);
	}
}
