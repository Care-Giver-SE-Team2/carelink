package sg.nus.carelink.incident.domain.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.model.PageSlice;

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

	/**
	 * One page of the manager's queue: the incidents in the given states, most urgent first.
	 *
	 * <p>"Most urgent" is respond_by ascending with the incidents that have no deadline at
	 * the end, then newest first among those. A deadline is a promise to somebody; an
	 * incident that has one and is closest to breaking it belongs at the top, and an SOS
	 * that was never routed has no deadline to break but must still be visible.
	 *
	 * <p>Both filters are optional and {@code null} means "do not filter": a manager opening
	 * the queue does not know any elder's id, which is precisely why asking for one was the
	 * wrong shape for this endpoint.
	 *
	 * @param statuses which states count as still needing attention; never empty
	 * @param severity a single severity to show, or null for all of them
	 * @param elderId  one elder's incidents, or null for every elder's
	 */
	PageSlice<Incident> findQueue(
			Set<Incident.Status> statuses, Incident.Severity severity, Long elderId, int page, int size);

	/**
	 * The manager who handled this elder's most recent other incident.
	 *
	 * <p>Continuity: the escalation chain offers a new incident to somebody who already knows
	 * the elder before it offers it to a stranger. The incident being routed is excluded, or
	 * it would nominate its own current responder.
	 */
	Optional<Long> lastResponderForElder(Long elderId, Long excludingIncidentId);
}
