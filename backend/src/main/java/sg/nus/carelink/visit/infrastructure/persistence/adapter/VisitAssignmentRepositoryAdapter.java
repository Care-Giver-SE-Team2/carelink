package sg.nus.carelink.visit.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.visit.domain.model.VisitAssignment;
import sg.nus.carelink.visit.domain.repository.VisitAssignmentRepository;
import sg.nus.carelink.visit.infrastructure.persistence.repository.VisitAssignmentJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class VisitAssignmentRepositoryAdapter implements VisitAssignmentRepository {

	private final VisitAssignmentJpaRepository jpa;

	VisitAssignmentRepositoryAdapter(VisitAssignmentJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<VisitAssignment> findById(Long id) {
		return jpa.findById(id).map(VisitAssignmentMapper::toDomain);
	}

	@Override
	public VisitAssignment save(VisitAssignment visitAssignment) {
		return VisitAssignmentMapper.toDomain(jpa.save(VisitAssignmentMapper.toEntity(visitAssignment)));
	}
}
