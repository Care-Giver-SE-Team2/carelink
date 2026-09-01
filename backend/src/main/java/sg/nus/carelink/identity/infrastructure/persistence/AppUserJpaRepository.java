package sg.nus.carelink.identity.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Spring Data 仓储。仅在持久化层内部使用，不向外暴露。 */
interface AppUserJpaRepository extends JpaRepository<AppUserJpaEntity, Long> {

	Optional<AppUserJpaEntity> findByUsername(String username);
}
