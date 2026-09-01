package sg.nus.carelink.identity.application;

import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.identity.domain.repository.AppUserRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * 手写的内存仓储假实现。
 *
 * <p>这就是「领域层声明仓储接口、持久化层去实现」这个设计换来的东西：
 * 测试里塞一个这样的类，就能在不启动 Spring、不连数据库的情况下
 * 把应用层的逻辑跑通。各模块写测试时照抄这个套路。
 */
public class InMemoryAppUserRepository implements AppUserRepository {

	private final List<AppUser> users = new ArrayList<>();

	public InMemoryAppUserRepository with(AppUser user) {
		users.add(user);
		return this;
	}

	@Override
	public Optional<AppUser> findByUsername(String username) {
		return users.stream().filter(u -> u.username().equals(username)).findFirst();
	}

	@Override
	public Optional<AppUser> findById(Long id) {
		return users.stream().filter(u -> id.equals(u.id())).findFirst();
	}
}
