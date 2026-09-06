package sg.nus.carelink.visit.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for visit. Used inside the persistence layer only; never exposed outwards. */
interface VisitJpaRepository extends JpaRepository<VisitJpaEntity, Long> {
}
