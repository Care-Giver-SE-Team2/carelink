package sg.nus.carelink.incident.infrastructure.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sg.nus.carelink.incident.infrastructure.persistence.entity.SpotCheckJpaEntity;

/** Spring Data repository for spot_check. Used by persistence.adapter only; never exposed outwards. */
public interface SpotCheckJpaRepository extends JpaRepository<SpotCheckJpaEntity, Long> {
}
