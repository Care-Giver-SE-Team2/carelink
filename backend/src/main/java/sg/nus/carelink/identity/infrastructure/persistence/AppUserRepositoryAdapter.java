package sg.nus.carelink.identity.infrastructure.persistence;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.identity.domain.repository.AppUserRepository;

import java.util.Optional;

/**
 * 领域层仓储接口的实现。依赖方向是 infrastructure → domain，而不是反过来，
 * 这就是「依赖倒置」在代码上的样子。
 */
@Repository
class AppUserRepositoryAdapter implements AppUserRepository {

	private final AppUserJpaRepository jpa;

	AppUserRepositoryAdapter(AppUserJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<AppUser> findByUsername(String username) {
		return jpa.findByUsername(username).map(AppUserMapper::toDomain);
	}

	@Override
	public Optional<AppUser> findById(Long id) {
		return jpa.findById(id).map(AppUserMapper::toDomain);
	}
}
