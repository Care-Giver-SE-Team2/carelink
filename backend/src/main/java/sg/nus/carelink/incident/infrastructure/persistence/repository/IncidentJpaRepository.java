package sg.nus.carelink.incident.infrastructure.persistence.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

	/**
	 * Recent incidents for one elder that had a responder and are not the one being routed.
	 *
	 * <p>The adapter takes the first row as the manager who knows this elder. Limiting the
	 * page keeps it to one index read; the caller only ever wants the newest.
	 */
	List<IncidentJpaEntity> findByElderIdAndIdNotAndResponderUserIdNotNullOrderByReportedAtDesc(
			Long elderId, Long excludedId, Pageable pageable);

	/**
	 * One page of the manager's queue.
	 *
	 * <p>Severity is taken as a collection rather than a single value so that "no severity
	 * filter" is expressed by passing all three rather than by a null parameter: a derived
	 * query compares with {@code = null}, which matches no row, and the queue would come
	 * back empty for the commonest request of all.
	 *
	 * <p>The ordering is not in the method name. It is a domain decision - whoever is
	 * closest to a broken deadline first - and the adapter states it once as a {@link
	 * org.springframework.data.domain.Sort} it puts on the {@link Pageable}.
	 */
	Page<IncidentJpaEntity> findByStatusInAndSeverityIn(
			Collection<IncidentJpaEntity.Status> statuses,
			Collection<IncidentJpaEntity.Severity> severities,
			Pageable pageable);

	/** As above, narrowed to one elder. The older per-elder listing, now a filter on the queue. */
	Page<IncidentJpaEntity> findByStatusInAndSeverityInAndElderId(
			Collection<IncidentJpaEntity.Status> statuses,
			Collection<IncidentJpaEntity.Severity> severities,
			Long elderId,
			Pageable pageable);
}
