package sg.nus.carelink.profile.domain.repository;

import java.util.Optional;

import sg.nus.carelink.profile.domain.model.Credential;

/**
 * Port for credential: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.CredentialRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface CredentialRepository {

	Optional<Credential> findById(Long id);

	Credential save(Credential credential);
}
