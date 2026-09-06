package sg.nus.carelink.careplan.application;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.careplan.domain.model.CarePlan;
import sg.nus.carelink.careplan.domain.repository.CarePlanRepository;

/**
 * Application layer of the careplan module (care plans, the plan node tree and the credentials a plan requires).
 *
 * <p>One public method per use case (UC-MG01): it loads what it needs through
 * the domain ports, calls the domain model, saves, and returns. Business rules stay in
 * domain.model. identity.application.IdentityService is the template.
 */
@Service
@Transactional
public class CarePlanService {

	private final CarePlanRepository carePlans;

	public CarePlanService(CarePlanRepository carePlans) {
		this.carePlans = carePlans;
	}

	@Transactional(readOnly = true)
	public Optional<CarePlan> findCarePlan(Long id) {
		return carePlans.findById(id);
	}
}
