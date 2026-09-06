package sg.nus.carelink.profile.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import sg.nus.carelink.profile.domain.model.ElderFamilyBinding;
import sg.nus.carelink.profile.domain.repository.ElderFamilyBindingRepository;
import sg.nus.carelink.profile.infrastructure.persistence.repository.ElderFamilyBindingJpaRepository;

/**
 * Implements the domain port with Spring Data. The dependency points infrastructure ->
 * domain, never the other way round (dependency inversion, as in identity).
 */
@Repository
class ElderFamilyBindingRepositoryAdapter implements ElderFamilyBindingRepository {

	private final ElderFamilyBindingJpaRepository jpa;

	ElderFamilyBindingRepositoryAdapter(ElderFamilyBindingJpaRepository jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<ElderFamilyBinding> findById(Long id) {
		return jpa.findById(id).map(ElderFamilyBindingMapper::toDomain);
	}

	@Override
	public ElderFamilyBinding save(ElderFamilyBinding elderFamilyBinding) {
		return ElderFamilyBindingMapper.toDomain(jpa.save(ElderFamilyBindingMapper.toEntity(elderFamilyBinding)));
	}
}
