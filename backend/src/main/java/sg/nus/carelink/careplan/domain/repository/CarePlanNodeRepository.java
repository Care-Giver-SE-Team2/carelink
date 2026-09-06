package sg.nus.carelink.careplan.domain.repository;

import java.util.Optional;

import sg.nus.carelink.careplan.domain.model.CarePlanNode;

/**
 * Port for care_plan_node: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.CarePlanNodeRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface CarePlanNodeRepository {

	Optional<CarePlanNode> findById(Long id);

	CarePlanNode save(CarePlanNode carePlanNode);
}
