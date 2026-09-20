package sg.nus.carelink.incident.infrastructure.persistence.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import sg.nus.carelink.incident.infrastructure.persistence.entity.IncidentJpaEntity;

/** Spring Data repository for incident. Used by persistence.adapter only; never exposed outwards. */
public interface IncidentJpaRepository extends JpaRepository<IncidentJpaEntity, Long> {

	/**
	 * Backs the scheduled scan of UC-SYS02: incidents in one of the given states whose
	 * response deadline has passed, oldest deadline first.
	 *
	 * <p>Uses the idx_incident_deadline (status, respond_by) index created for it in V2.
	 * Which states count as "still waiting to be taken over" is a domain rule and is
	 * supplied by the adapter, not decided here.
	 */
	List<IncidentJpaEntity> findByStatusInAndRespondByNotNullAndRespondByLessThanEqualOrderByRespondByAsc(
			Collection<IncidentJpaEntity.Status> statuses, LocalDateTime deadline);

	List<IncidentJpaEntity> findByElderIdOrderByReportedAtDesc(Long elderId);
}
