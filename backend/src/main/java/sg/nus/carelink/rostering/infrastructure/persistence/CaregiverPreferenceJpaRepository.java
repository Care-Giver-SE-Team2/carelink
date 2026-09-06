package sg.nus.carelink.rostering.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for caregiver_preference. Used inside the persistence layer only; never exposed outwards. */
interface CaregiverPreferenceJpaRepository extends JpaRepository<CaregiverPreferenceJpaEntity, Long> {
}
