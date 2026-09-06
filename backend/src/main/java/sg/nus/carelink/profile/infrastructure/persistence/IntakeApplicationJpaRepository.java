package sg.nus.carelink.profile.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for intake_application. Used inside the persistence layer only; never exposed outwards. */
interface IntakeApplicationJpaRepository extends JpaRepository<IntakeApplicationJpaEntity, Long> {
}
