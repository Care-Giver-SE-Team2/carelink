package sg.nus.carelink.visit.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.visit.domain.model.ElderConfirmation;
import sg.nus.carelink.visit.domain.repository.ElderConfirmationRepository;
import sg.nus.carelink.visit.infrastructure.persistence.repository.ElderConfirmationJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class ElderConfirmationRepositoryAdapter implements ElderConfirmationRepository {

	private final ElderConfirmationJpaRepository jpa;

	ElderConfirmationRepositoryAdapter(ElderConfirmationJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<ElderConfirmation> findById(Long id) {
		return jpa.findById(id).map(ElderConfirmationMapper::toDomain);
	}

	@Override
	public ElderConfirmation save(ElderConfirmation elderConfirmation) {
		return ElderConfirmationMapper.toDomain(jpa.save(ElderConfirmationMapper.toEntity(elderConfirmation)));
	}
}
