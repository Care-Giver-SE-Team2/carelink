package sg.nus.carelink.report.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for value_added_service. Used inside the persistence layer only; never exposed outwards. */
interface ValueAddedServiceJpaRepository extends JpaRepository<ValueAddedServiceJpaEntity, Long> {
}
