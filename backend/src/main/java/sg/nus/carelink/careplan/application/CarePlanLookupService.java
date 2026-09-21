package sg.nus.carelink.careplan.application;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.careplan.domain.model.CarePlan;
import sg.nus.carelink.careplan.domain.repository.CarePlanRepository;

@Service
@Transactional(readOnly = true)
class CarePlanLookupService implements CarePlanLookup {

	private final CarePlanRepository carePlans;

	CarePlanLookupService(CarePlanRepository carePlans) {
		this.carePlans = carePlans;
	}

	@Override
	public Optional<CarePlan> findLatestByElderId(Long elderId) {
		return carePlans.findLatestByElderId(elderId);
	}
}
