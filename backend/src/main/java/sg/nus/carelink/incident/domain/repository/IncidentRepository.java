package sg.nus.carelink.incident.domain.repository;

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
}
