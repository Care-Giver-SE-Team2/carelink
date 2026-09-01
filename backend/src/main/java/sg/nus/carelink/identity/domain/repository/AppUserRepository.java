package sg.nus.carelink.identity.domain.repository;

import sg.nus.carelink.identity.domain.model.AppUser;

import java.util.Optional;

/**
 * 仓储接口，由领域层声明「我需要什么」，
 * 实现放在 infrastructure.persistence（依赖倒置）。
 *
 * <p>这正是领域层能脱离数据库做单元测试的原因：测试里塞一个假实现即可。
 */
public interface AppUserRepository {

	Optional<AppUser> findByUsername(String username);

	Optional<AppUser> findById(Long id);
}
