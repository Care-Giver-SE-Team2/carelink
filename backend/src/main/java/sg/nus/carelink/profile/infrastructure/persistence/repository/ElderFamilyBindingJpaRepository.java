package sg.nus.carelink.profile.infrastructure.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sg.nus.carelink.profile.infrastructure.persistence.entity.ElderFamilyBindingJpaEntity;

/** Spring Data repository for elder_family_binding. Used by persistence.adapter only; never exposed outwards. */
public interface ElderFamilyBindingJpaRepository extends JpaRepository<ElderFamilyBindingJpaEntity, Long> {
}
