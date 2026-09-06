package sg.nus.carelink.incident.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.incident.domain.model.Incident;

class IncidentServiceTest {

	private final InMemoryIncidentRepository repository = new InMemoryIncidentRepository();
	private final IncidentService service = new IncidentService(repository);

	@Test
	void findsWhatWasSaved() {
		Incident saved = repository.save(new Incident(
				null,
				2L,
				3L,
				4L,
				5L,
				Incident.Source.CAREGIVER,
				Incident.Category.SOS,
				Incident.Severity.LOW,
				Incident.Status.OPEN,
				new BigDecimal("10.5"),
				new BigDecimal("11.5"),
				"v12",
				"v13",
				LocalDateTime.of(2026, 9, 6, 10, 14),
				LocalDateTime.of(2026, 9, 6, 10, 15),
				LocalDateTime.of(2026, 9, 6, 10, 16)));

		assertThat(service.findIncident(saved.id())).contains(saved);
	}

	@Test
	void isEmptyForAnUnknownId() {
		assertThat(service.findIncident(999L)).isEmpty();
	}
}
