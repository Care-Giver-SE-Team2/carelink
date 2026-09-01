package sg.nus.carelink.identity.application;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.shared.security.Role;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 应用层单元测试的参照写法：用假仓储替掉数据库，不启动 Spring。
 */
class UserDirectoryServiceTest {

	private final AppUser alice = new AppUser(1L, "alice", "Alice Tan", Set.of(Role.MANAGER), true);
	private final UserDirectory directory =
			new UserDirectoryService(new InMemoryAppUserRepository().with(alice));

	@Test
	@DisplayName("按账号名查得到")
	void 按账号名查询() {
		assertThat(directory.findByUsername("alice")).contains(alice);
	}

	@Test
	@DisplayName("按主键查得到")
	void 按主键查询() {
		assertThat(directory.findById(1L)).contains(alice);
	}

	@Test
	@DisplayName("查不到时返回空而不是抛异常")
	void 查不到返回空() {
		assertThat(directory.findByUsername("nobody")).isEmpty();
		assertThat(directory.findById(999L)).isEmpty();
	}
}
