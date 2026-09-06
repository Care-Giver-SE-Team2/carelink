package sg.nus.carelink.rostering.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for rostering_constraint. Used inside the persistence layer only; never exposed outwards. */
interface RosteringConstraintJpaRepository extends JpaRepository<RosteringConstraintJpaEntity, Long> {
}
