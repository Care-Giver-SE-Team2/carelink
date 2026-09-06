package sg.nus.carelink.careplan.domain.repository;

import java.util.Optional;

import sg.nus.carelink.careplan.domain.model.CarePlan;

/**
 * Port for care_plan: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.CarePlanRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface CarePlanRepository {

	Optional<CarePlan> findById(Long id);

	CarePlan save(CarePlan carePlan);
}
