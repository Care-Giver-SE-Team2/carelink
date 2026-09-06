package sg.nus.carelink.report.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for caregiver_review. Used inside the persistence layer only; never exposed outwards. */
interface CaregiverReviewJpaRepository extends JpaRepository<CaregiverReviewJpaEntity, Long> {
}
