package sg.nus.carelink.incident.support;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.IncidentRepository;

/** Test double for the port: the services are exercised without Spring or a database. */
public final class InMemoryIncidentRepository implements IncidentRepository {

	private final Map<Long, Incident> rows = new LinkedHashMap<>();
	private long nextId = 1;

	@Override
	public Optional<Incident> findById(Long id) {
		return Optional.ofNullable(rows.get(id));
	}

	@Override
	public Incident save(Incident incident) {
		Incident stored = incident.id() == null ? IncidentFixtures.withId(incident, nextId++) : incident;
		rows.put(stored.id(), stored);
		return stored;
	}

	@Override
	public List<Incident> findAwaitingTakeOverPastDeadline(LocalDateTime deadline) {
		List<Incident> overdue = new ArrayList<>();
		for (Incident incident : rows.values()) {
			if (incident.awaitingTakeOver()
					&& incident.respondBy() != null
					&& !incident.respondBy().isAfter(deadline)) {
				overdue.add(incident);
			}
		}
		overdue.sort(Comparator.comparing(Incident::respondBy));
		return List.copyOf(overdue);
	}

	@Override
	public List<Incident> findByElder(Long elderId) {
		return rows.values().stream()
				.filter(incident -> incident.elderId().equals(elderId))
				.sorted(Comparator.comparing(Incident::reportedAt).reversed())
				.toList();
	}

	public int size() {
		return rows.size();
	}
}
