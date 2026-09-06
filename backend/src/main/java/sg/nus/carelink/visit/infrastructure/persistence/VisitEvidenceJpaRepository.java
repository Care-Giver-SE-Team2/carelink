package sg.nus.carelink.visit.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for visit_evidence. Used inside the persistence layer only; never exposed outwards. */
interface VisitEvidenceJpaRepository extends JpaRepository<VisitEvidenceJpaEntity, Long> {
}
