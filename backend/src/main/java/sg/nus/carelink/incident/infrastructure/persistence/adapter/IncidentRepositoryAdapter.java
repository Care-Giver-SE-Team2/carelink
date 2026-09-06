package sg.nus.carelink.incident.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.IncidentRepository;
import sg.nus.carelink.incident.infrastructure.persistence.repository.IncidentJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class IncidentRepositoryAdapter implements IncidentRepository {

	private final IncidentJpaRepository jpa;

	IncidentRepositoryAdapter(IncidentJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<Incident> findById(Long id) {
		return jpa.findById(id).map(IncidentMapper::toDomain);
	}

	@Override
	public Incident save(Incident incident) {
		return IncidentMapper.toDomain(jpa.save(IncidentMapper.toEntity(incident)));
	}
}
