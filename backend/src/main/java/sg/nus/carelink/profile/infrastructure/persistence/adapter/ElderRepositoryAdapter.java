package sg.nus.carelink.profile.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.profile.domain.model.Elder;
import sg.nus.carelink.profile.domain.repository.ElderRepository;
import sg.nus.carelink.profile.infrastructure.persistence.repository.ElderJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class ElderRepositoryAdapter implements ElderRepository {

	private final ElderJpaRepository jpa;

	ElderRepositoryAdapter(ElderJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<Elder> findById(Long id) {
		return jpa.findById(id).map(ElderMapper::toDomain);
	}

	@Override
	public Elder save(Elder elder) {
		return ElderMapper.toDomain(jpa.save(ElderMapper.toEntity(elder)));
	}
}
