package sg.nus.carelink.profile.domain.repository;

import java.util.Optional;

import sg.nus.carelink.profile.domain.model.ElderFamilyBinding;

/**
 * Port for elder_family_binding: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.ElderFamilyBindingRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface ElderFamilyBindingRepository {

	Optional<ElderFamilyBinding> findById(Long id);

	ElderFamilyBinding save(ElderFamilyBinding elderFamilyBinding);
}
