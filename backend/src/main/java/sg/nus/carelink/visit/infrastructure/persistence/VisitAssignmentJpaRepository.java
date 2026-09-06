package sg.nus.carelink.visit.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for visit_assignment. Used inside the persistence layer only; never exposed outwards. */
interface VisitAssignmentJpaRepository extends JpaRepository<VisitAssignmentJpaEntity, Long> {
}
