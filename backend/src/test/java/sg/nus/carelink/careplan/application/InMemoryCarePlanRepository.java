package sg.nus.carelink.careplan.application;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import sg.nus.carelink.careplan.domain.model.CarePlan;
import sg.nus.carelink.careplan.domain.repository.CarePlanRepository;

/** Test double for the port: the service is exercised without Spring or a database (as in identity). */
class InMemoryCarePlanRepository implements CarePlanRepository {

	private final Map<Long, CarePlan> rows = new HashMap<>();
	private long nextId = 1;

	@Override
	public Optional<CarePlan> findById(Long id) {
		return Optional.ofNullable(rows.get(id));
	}

	@Override
	public CarePlan save(CarePlan carePlan) {
		CarePlan stored = carePlan.id() == null
				? new CarePlan(nextId, carePlan.elderId(), carePlan.createdByUserId(), carePlan.supersedesPlanId(), carePlan.version(), carePlan.status(), carePlan.totalHours(), carePlan.publishedAt(), carePlan.createdAt(), carePlan.updatedAt())
				: carePlan;
		rows.put(stored.id(), stored);
		if (carePlan.id() == null) {
			nextId++;
		}
		return stored;
	}
}
