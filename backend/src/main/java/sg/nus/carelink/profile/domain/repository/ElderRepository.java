package sg.nus.carelink.profile.domain.repository;

import java.util.Optional;

import sg.nus.carelink.profile.domain.model.Elder;

/**
 * Port for elder: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.ElderRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface ElderRepository {

	Optional<Elder> findById(Long id);

	Elder save(Elder elder);
}
