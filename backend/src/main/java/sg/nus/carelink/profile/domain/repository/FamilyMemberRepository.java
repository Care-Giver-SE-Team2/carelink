package sg.nus.carelink.profile.domain.repository;

import java.util.Optional;

import sg.nus.carelink.profile.domain.model.FamilyMember;

/**
 * Port for family_member: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.FamilyMemberRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface FamilyMemberRepository {

	Optional<FamilyMember> findById(Long id);

	FamilyMember save(FamilyMember familyMember);
}
