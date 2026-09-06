package sg.nus.carelink.profile.domain.repository;

import java.util.Optional;

import sg.nus.carelink.profile.domain.model.Caregiver;

/**
 * Port for caregiver: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.CaregiverRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface CaregiverRepository {

	Optional<Caregiver> findById(Long id);

	Caregiver save(Caregiver caregiver);
}
