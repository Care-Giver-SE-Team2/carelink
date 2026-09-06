package sg.nus.carelink.rostering.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for rostering_candidate. Used inside the persistence layer only; never exposed outwards. */
interface RosteringCandidateJpaRepository extends JpaRepository<RosteringCandidateJpaEntity, Long> {
}
