package sg.nus.carelink.profile.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for caregiver. Used inside the persistence layer only; never exposed outwards. */
interface CaregiverJpaRepository extends JpaRepository<CaregiverJpaEntity, Long> {
}
