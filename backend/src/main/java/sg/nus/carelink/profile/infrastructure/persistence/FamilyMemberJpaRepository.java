package sg.nus.carelink.profile.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for family_member. Used inside the persistence layer only; never exposed outwards. */
interface FamilyMemberJpaRepository extends JpaRepository<FamilyMemberJpaEntity, Long> {
}
