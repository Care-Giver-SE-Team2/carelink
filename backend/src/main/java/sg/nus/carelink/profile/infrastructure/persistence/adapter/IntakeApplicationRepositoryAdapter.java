package sg.nus.carelink.profile.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.profile.domain.model.IntakeApplication;
import sg.nus.carelink.profile.domain.repository.IntakeApplicationRepository;
import sg.nus.carelink.profile.infrastructure.persistence.repository.IntakeApplicationJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class IntakeApplicationRepositoryAdapter implements IntakeApplicationRepository {

	private final IntakeApplicationJpaRepository jpa;

	IntakeApplicationRepositoryAdapter(IntakeApplicationJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<IntakeApplication> findById(Long id) {
		return jpa.findById(id).map(IntakeApplicationMapper::toDomain);
	}

	@Override
	public IntakeApplication save(IntakeApplication intakeApplication) {
		return IntakeApplicationMapper.toDomain(jpa.save(IntakeApplicationMapper.toEntity(intakeApplication)));
	}
}
