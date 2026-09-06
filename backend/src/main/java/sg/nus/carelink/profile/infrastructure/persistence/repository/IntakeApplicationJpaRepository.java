package sg.nus.carelink.profile.infrastructure.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sg.nus.carelink.profile.infrastructure.persistence.entity.IntakeApplicationJpaEntity;

/** Spring Data repository for intake_application. Used by persistence.adapter only; never exposed outwards. */
public interface IntakeApplicationJpaRepository extends JpaRepository<IntakeApplicationJpaEntity, Long> {
}
