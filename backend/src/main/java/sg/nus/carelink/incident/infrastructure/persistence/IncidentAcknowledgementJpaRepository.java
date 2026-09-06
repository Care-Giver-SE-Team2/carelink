package sg.nus.carelink.incident.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for incident_acknowledgement. Used inside the persistence layer only; never exposed outwards. */
interface IncidentAcknowledgementJpaRepository extends JpaRepository<IncidentAcknowledgementJpaEntity, Long> {
}
