package sg.nus.carelink.visit.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.visit.domain.model.VisitStateTransition;
import sg.nus.carelink.visit.domain.repository.VisitStateTransitionRepository;
import sg.nus.carelink.visit.infrastructure.persistence.repository.VisitStateTransitionJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class VisitStateTransitionRepositoryAdapter implements VisitStateTransitionRepository {

	private final VisitStateTransitionJpaRepository jpa;

	VisitStateTransitionRepositoryAdapter(VisitStateTransitionJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<VisitStateTransition> findById(Long id) {
		return jpa.findById(id).map(VisitStateTransitionMapper::toDomain);
	}

	@Override
	public VisitStateTransition save(VisitStateTransition visitStateTransition) {
		return VisitStateTransitionMapper.toDomain(jpa.save(VisitStateTransitionMapper.toEntity(visitStateTransition)));
	}
}
