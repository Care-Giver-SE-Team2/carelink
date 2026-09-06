package sg.nus.carelink.profile.domain.repository;

import java.util.Optional;

import sg.nus.carelink.profile.domain.model.CredentialType;

/**
 * Port for credential_type: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.CredentialTypeRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface CredentialTypeRepository {

	Optional<CredentialType> findById(Long id);

	CredentialType save(CredentialType credentialType);
}
