package sg.nus.carelink.identity.domain.model;

import sg.nus.carelink.shared.security.Role;

import java.util.Collections;
import java.util.Objects;
import java.util.Set;

/**
 * 账号的领域模型。
 *
 * <p>刻意不含密码散列：密码是认证机制的实现细节，属于 infrastructure，
 * 领域层只关心「这是谁、他能做什么」。
 *
 * <p>本类不带任何框架注解，可以直接 new 出来做单元测试。
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
