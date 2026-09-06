package sg.nus.carelink.incident.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.incident.domain.model.SpotCheck;
import sg.nus.carelink.incident.domain.repository.SpotCheckRepository;
import sg.nus.carelink.incident.infrastructure.persistence.repository.SpotCheckJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class SpotCheckRepositoryAdapter implements SpotCheckRepository {

	private final SpotCheckJpaRepository jpa;

	SpotCheckRepositoryAdapter(SpotCheckJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<SpotCheck> findById(Long id) {
		return jpa.findById(id).map(SpotCheckMapper::toDomain);
	}

	@Override
	public SpotCheck save(SpotCheck spotCheck) {
		return SpotCheckMapper.toDomain(jpa.save(SpotCheckMapper.toEntity(spotCheck)));
	}
}
