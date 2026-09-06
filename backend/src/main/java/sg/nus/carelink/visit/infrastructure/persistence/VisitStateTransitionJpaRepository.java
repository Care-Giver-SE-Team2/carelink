package sg.nus.carelink.visit.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for visit_state_transition. Used inside the persistence layer only; never exposed outwards. */
interface VisitStateTransitionJpaRepository extends JpaRepository<VisitStateTransitionJpaEntity, Long> {
}
