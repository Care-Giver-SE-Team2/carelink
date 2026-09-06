package sg.nus.carelink.profile.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for elder. Used inside the persistence layer only; never exposed outwards. */
interface ElderJpaRepository extends JpaRepository<ElderJpaEntity, Long> {
}
