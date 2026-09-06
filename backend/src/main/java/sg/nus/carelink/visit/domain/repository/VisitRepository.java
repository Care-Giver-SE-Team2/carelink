package sg.nus.carelink.visit.domain.repository;

import java.util.Optional;

import sg.nus.carelink.visit.domain.model.Visit;

/**
 * Port for visit: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.VisitRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface VisitRepository {

	Optional<Visit> findById(Long id);

	Visit save(Visit visit);
}
