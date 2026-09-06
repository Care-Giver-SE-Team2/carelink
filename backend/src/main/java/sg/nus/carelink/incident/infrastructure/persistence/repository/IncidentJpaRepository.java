package sg.nus.carelink.incident.infrastructure.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sg.nus.carelink.incident.infrastructure.persistence.entity.IncidentJpaEntity;

/** Spring Data repository for incident. Used by persistence.adapter only; never exposed outwards. */
public interface IncidentJpaRepository extends JpaRepository<IncidentJpaEntity, Long> {
}
