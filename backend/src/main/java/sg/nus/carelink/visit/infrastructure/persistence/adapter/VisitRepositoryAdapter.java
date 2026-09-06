package sg.nus.carelink.visit.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.visit.domain.model.Visit;
import sg.nus.carelink.visit.domain.repository.VisitRepository;
import sg.nus.carelink.visit.infrastructure.persistence.repository.VisitJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class VisitRepositoryAdapter implements VisitRepository {

	private final VisitJpaRepository jpa;

	VisitRepositoryAdapter(VisitJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<Visit> findById(Long id) {
		return jpa.findById(id).map(VisitMapper::toDomain);
	}

	@Override
	public Visit save(Visit visit) {
		return VisitMapper.toDomain(jpa.save(VisitMapper.toEntity(visit)));
	}
}
