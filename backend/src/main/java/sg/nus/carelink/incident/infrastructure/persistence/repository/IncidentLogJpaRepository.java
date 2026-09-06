package sg.nus.carelink.incident.infrastructure.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sg.nus.carelink.incident.infrastructure.persistence.entity.IncidentLogJpaEntity;

/** Spring Data repository for incident_log. Used by persistence.adapter only; never exposed outwards. */
public interface IncidentLogJpaRepository extends JpaRepository<IncidentLogJpaEntity, Long> {
}
