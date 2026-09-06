package sg.nus.carelink.careplan.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for care_plan_required_credential. Used inside the persistence layer only; never exposed outwards. */
interface CarePlanRequiredCredentialJpaRepository extends JpaRepository<CarePlanRequiredCredentialJpaEntity, CarePlanRequiredCredentialJpaEntity.Id> {
}
