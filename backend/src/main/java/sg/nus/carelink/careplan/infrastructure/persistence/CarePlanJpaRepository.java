package sg.nus.carelink.careplan.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for care_plan. Used inside the persistence layer only; never exposed outwards. */
interface CarePlanJpaRepository extends JpaRepository<CarePlanJpaEntity, Long> {
}
