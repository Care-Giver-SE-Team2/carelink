package sg.nus.carelink.incident.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for spot_check. Used inside the persistence layer only; never exposed outwards. */
interface SpotCheckJpaRepository extends JpaRepository<SpotCheckJpaEntity, Long> {
}
