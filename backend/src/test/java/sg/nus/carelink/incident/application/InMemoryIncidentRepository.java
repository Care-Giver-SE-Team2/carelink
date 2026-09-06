package sg.nus.carelink.incident.application;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.IncidentRepository;

/** Test double for the port: the service is exercised without Spring or a database (as in identity). */
class InMemoryIncidentRepository implements IncidentRepository {

	private final Map<Long, Incident> rows = new HashMap<>();
	private long nextId = 1;

	@Override
	public Optional<Incident> findById(Long id) {
		return Optional.ofNullable(rows.get(id));
	}

	@Override
	public Incident save(Incident incident) {
		Incident stored = incident.id() == null
				? new Incident(nextId, incident.elderId(), incident.visitId(), incident.reportedByUserId(), incident.responderUserId(), incident.source(), incident.category(), incident.severity(), incident.status(), incident.latitude(), incident.longitude(), incident.locationText(), incident.description(), incident.respondBy(), incident.reportedAt(), incident.resolvedAt())
				: incident;
		rows.put(stored.id(), stored);
		if (incident.id() == null) {
			nextId++;
		}
		return stored;
	}
}
