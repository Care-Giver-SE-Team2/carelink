package sg.nus.carelink.identity.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Spring Data repository. Used inside the persistence layer only; never exposed outwards. */
interface AppUserJpaRepository extends JpaRepository<AppUserJpaEntity, Long> {

	Optional<AppUserJpaEntity> findByUsername(String username);
}
