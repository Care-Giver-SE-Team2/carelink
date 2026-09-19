package sg.nus.carelink.incident.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.incident.domain.model.Incident;

class IncidentServiceTest {

	private final InMemoryIncidentRepository repository =
			new InMemoryIncidentRepository();

	private final IncidentService service =
			new IncidentService(repository);

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
				LocalDateTime.of(
						2026,
						9,
						6,
						10,
						14
				),
				LocalDateTime.of(
						2026,
						9,
						6,
						10,
						15
				),
				LocalDateTime.of(
						2026,
						9,
						6,
						10,
						16
				)
		));

		assertThat(service.findIncident(saved.id()))
				.contains(saved);
	}

	@Test
	void isEmptyForAnUnknownId() {
		assertThat(service.findIncident(999L))
				.isEmpty();
	}

	@Test
	void createsAndSavesElderEmergency() {
		Incident created =
				service.createElderEmergency(
						1L,
						7L,
						new BigDecimal("1.2966"),
						new BigDecimal("103.7764"),
						"Test Elder Home",
						"EL03 emergency call test"
				);

		assertThat(created.id())
				.isNotNull();

		assertThat(created.elderId())
				.isEqualTo(1L);

		assertThat(created.reportedByUserId())
				.isEqualTo(7L);

		assertThat(created.source())
				.isEqualTo(
						Incident.Source.ELDER_SOS
				);

		assertThat(created.category())
				.isEqualTo(
						Incident.Category.SOS
				);

		assertThat(created.severity())
				.isEqualTo(
						Incident.Severity.HIGH
				);

		assertThat(created.status())
				.isEqualTo(
						Incident.Status.OPEN
				);

		assertThat(created.latitude())
				.isEqualByComparingTo(
						new BigDecimal("1.2966")
				);

		assertThat(created.longitude())
				.isEqualByComparingTo(
						new BigDecimal("103.7764")
				);

		assertThat(created.locationText())
				.isEqualTo(
						"Test Elder Home"
				);

		assertThat(created.description())
				.isEqualTo(
						"EL03 emergency call test"
				);

		assertThat(created.reportedAt())
				.isNotNull();

		assertThat(service.findIncident(created.id()))
				.contains(created);
	}
}