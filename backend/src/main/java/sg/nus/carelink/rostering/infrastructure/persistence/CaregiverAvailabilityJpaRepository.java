package sg.nus.carelink.rostering.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for caregiver_availability. Used inside the persistence layer only; never exposed outwards. */
interface CaregiverAvailabilityJpaRepository extends JpaRepository<CaregiverAvailabilityJpaEntity, Long> {
}
