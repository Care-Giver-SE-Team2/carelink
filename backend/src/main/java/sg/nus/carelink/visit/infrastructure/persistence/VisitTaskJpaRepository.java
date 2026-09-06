package sg.nus.carelink.visit.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for visit_task. Used inside the persistence layer only; never exposed outwards. */
interface VisitTaskJpaRepository extends JpaRepository<VisitTaskJpaEntity, Long> {
}
