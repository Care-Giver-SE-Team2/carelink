package sg.nus.carelink.visit.application;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import sg.nus.carelink.visit.domain.model.Visit;
import sg.nus.carelink.visit.domain.repository.VisitRepository;

/** Test double for the port: the service is exercised without Spring or a database (as in identity). */
class InMemoryVisitRepository implements VisitRepository {

	private final Map<Long, Visit> rows = new HashMap<>();
	private long nextId = 1;

	@Override
	public Optional<Visit> findById(Long id) {
		return Optional.ofNullable(rows.get(id));
	}

	@Override
	public Visit save(Visit visit) {
		Visit stored = visit.id() == null
				? new Visit(nextId, visit.elderId(), visit.caregiverId(), visit.carePlanNodeId(), visit.absenceId(), visit.serviceType(), visit.scheduledStart(), visit.scheduledEnd(), visit.checkedInAt(), visit.checkedOutAt(), visit.status(), visit.stateDeadline(), visit.carePlanId(), visit.version(), visit.createdAt(), visit.updatedAt())
				: visit;
		rows.put(stored.id(), stored);
		if (visit.id() == null) {
			nextId++;
		}
		return stored;
	}
}
