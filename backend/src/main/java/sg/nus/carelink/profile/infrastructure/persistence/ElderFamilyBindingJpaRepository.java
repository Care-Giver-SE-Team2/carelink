package sg.nus.carelink.profile.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for elder_family_binding. Used inside the persistence layer only; never exposed outwards. */
interface ElderFamilyBindingJpaRepository extends JpaRepository<ElderFamilyBindingJpaEntity, Long> {
}
