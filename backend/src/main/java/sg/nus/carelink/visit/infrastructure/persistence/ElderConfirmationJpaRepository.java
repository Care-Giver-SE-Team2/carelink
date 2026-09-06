package sg.nus.carelink.visit.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for elder_confirmation. Used inside the persistence layer only; never exposed outwards. */
interface ElderConfirmationJpaRepository extends JpaRepository<ElderConfirmationJpaEntity, Long> {
}
