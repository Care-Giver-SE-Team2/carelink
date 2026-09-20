package sg.nus.carelink.incident.domain.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import sg.nus.carelink.incident.domain.model.Incident;

/**
 * Port for incident: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.IncidentRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface IncidentRepository {

	Optional<Incident> findById(Long id);

	Incident save(Incident incident);

	/**
	 * Incidents still waiting for somebody to take them over whose countdown has run out.
	 *
	 * <p>Drives the scheduled scan of UC-SYS02. The index idx_incident_deadline
	 * (status, respond_by) exists for exactly this query.
	 */
	List<Incident> findAwaitingTakeOverPastDeadline(LocalDateTime deadline);

	/** Open incidents for one elder, newest first. Used by the manager dashboard. */
	List<Incident> findByElder(Long elderId);
}
