package sg.nus.carelink.careplan.infrastructure.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sg.nus.carelink.careplan.infrastructure.persistence.entity.CarePlanJpaEntity;

/** Spring Data repository for care_plan. Used by persistence.adapter only; never exposed outwards. */
public interface CarePlanJpaRepository extends JpaRepository<CarePlanJpaEntity, Long> {
}
