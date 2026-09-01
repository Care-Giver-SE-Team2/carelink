package sg.nus.carelink.identity.infrastructure.persistence;

import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.shared.security.Role;

import java.util.Set;
import java.util.stream.Collectors;

/** JPA 实体 → 领域模型。方向是单向的：领域模型不知道 JPA 的存在。 */
final class AppUserMapper {

	private AppUserMapper() {
	}

	static AppUser toDomain(AppUserJpaEntity entity) {
		Set<Role> roles = entity.getRoles().stream()
				.map(Role::valueOf)
				.collect(Collectors.toUnmodifiableSet());
		return new AppUser(entity.getId(), entity.getUsername(), entity.getDisplayName(), roles, entity.isEnabled());
	}
}
