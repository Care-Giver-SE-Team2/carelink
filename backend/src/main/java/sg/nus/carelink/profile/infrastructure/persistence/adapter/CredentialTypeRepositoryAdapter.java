package sg.nus.carelink.profile.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.profile.domain.model.CredentialType;
import sg.nus.carelink.profile.domain.repository.CredentialTypeRepository;
import sg.nus.carelink.profile.infrastructure.persistence.repository.CredentialTypeJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class CredentialTypeRepositoryAdapter implements CredentialTypeRepository {

	private final CredentialTypeJpaRepository jpa;

	CredentialTypeRepositoryAdapter(CredentialTypeJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<CredentialType> findById(Long id) {
		return jpa.findById(id).map(CredentialTypeMapper::toDomain);
	}

	@Override
	public CredentialType save(CredentialType credentialType) {
		return CredentialTypeMapper.toDomain(jpa.save(CredentialTypeMapper.toEntity(credentialType)));
	}
}
