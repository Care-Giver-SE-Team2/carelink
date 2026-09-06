package sg.nus.carelink.rostering.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for rostering_run. Used inside the persistence layer only; never exposed outwards. */
interface RosteringRunJpaRepository extends JpaRepository<RosteringRunJpaEntity, Long> {
}
