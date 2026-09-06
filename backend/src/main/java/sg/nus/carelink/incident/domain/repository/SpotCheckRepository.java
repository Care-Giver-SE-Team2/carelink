package sg.nus.carelink.incident.domain.repository;

import java.util.Optional;

import sg.nus.carelink.incident.domain.model.SpotCheck;

/**
 * Port for spot_check: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.SpotCheckRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface SpotCheckRepository {

	Optional<SpotCheck> findById(Long id);

	SpotCheck save(SpotCheck spotCheck);
}
