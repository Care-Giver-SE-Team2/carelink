package sg.nus.carelink.visit.domain.repository;

import java.util.Optional;

import sg.nus.carelink.visit.domain.model.ElderConfirmation;

/**
 * Port for elder_confirmation: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.ElderConfirmationRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface ElderConfirmationRepository {

	Optional<ElderConfirmation> findById(Long id);

	ElderConfirmation save(ElderConfirmation elderConfirmation);
}
