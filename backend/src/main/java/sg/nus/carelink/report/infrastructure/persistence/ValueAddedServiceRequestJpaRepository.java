package sg.nus.carelink.report.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for value_added_service_request. Used inside the persistence layer only; never exposed outwards. */
interface ValueAddedServiceRequestJpaRepository extends JpaRepository<ValueAddedServiceRequestJpaEntity, Long> {
}
