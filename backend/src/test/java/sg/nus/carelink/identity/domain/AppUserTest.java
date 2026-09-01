package sg.nus.carelink.identity.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.shared.security.Role;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 领域层单元测试的参照写法。
 *
 * <p>注意这里没有 {@code @SpringBootTest}、没有数据库、没有任何容器——
 * 直接 new 出领域对象来断言。整个类毫秒级跑完。
 * 五个模块的领域层测试都应该长这样。
 */
class AppUserTest {

	@Test
	@DisplayName("角色集合对外不可变，防止调用方绕过业务规则改权限")
	void 角色集合不可变() {
		AppUser user = new AppUser(1L, "alice", "Alice", Set.of(Role.CAREGIVER), true);

		assertThatThrownBy(() -> user.roles().add(Role.MANAGER))
				.isInstanceOf(UnsupportedOperationException.class);
	}

	@Test
	@DisplayName("hasRole 判断角色归属")
	void 判断角色归属() {
		AppUser user = new AppUser(1L, "bob", "Bob", Set.of(Role.MANAGER, Role.CAREGIVER), true);

		assertThat(user.hasRole(Role.MANAGER)).isTrue();
		assertThat(user.hasRole(Role.CAREGIVER)).isTrue();
		assertThat(user.hasRole(Role.FAMILY)).isFalse();
	}

	@Test
	@DisplayName("账号名与显示名不允许为空")
	void 必填字段校验() {
		assertThatThrownBy(() -> new AppUser(1L, null, "X", Set.of(), true))
				.isInstanceOf(NullPointerException.class)
				.hasMessage("username");
	}

	@Test
	@DisplayName("Spring Security 的权限名带 ROLE_ 前缀")
	void 权限名带前缀() {
		assertThat(Role.MANAGER.authority()).isEqualTo("ROLE_MANAGER");
		assertThat(Role.ELDER.authority()).isEqualTo("ROLE_ELDER");
	}
}
