package sg.nus.carelink.rostering.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for rostering_candidate_check. Used inside the persistence layer only; never exposed outwards. */
interface RosteringCandidateCheckJpaRepository extends JpaRepository<RosteringCandidateCheckJpaEntity, Long> {
}
