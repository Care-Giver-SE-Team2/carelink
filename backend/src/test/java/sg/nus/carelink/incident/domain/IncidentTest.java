package sg.nus.carelink.incident.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import sg.nus.carelink.incident.domain.model.Incident;

class IncidentTest {

	@Test
	@DisplayName("elder SOS creates an open high-severity SOS incident")
	void createsElderSosWithRequiredDefaults() {
		LocalDateTime before = LocalDateTime.now();

		Incident incident = Incident.createElderSos(
				1L,
				7L,
				new BigDecimal("1.2966"),
				new BigDecimal("103.7764"),
				"Test Elder Home",
				"EL03 emergency call test");

		LocalDateTime after = LocalDateTime.now();

		assertThat(incident.id()).isNull();
		assertThat(incident.elderId()).isEqualTo(1L);
		assertThat(incident.visitId()).isNull();
		assertThat(incident.reportedByUserId()).isEqualTo(7L);
		assertThat(incident.responderUserId()).isNull();

		assertThat(incident.source())
				.isEqualTo(Incident.Source.ELDER_SOS);

		assertThat(incident.category())
				.isEqualTo(Incident.Category.SOS);

		assertThat(incident.severity())
				.isEqualTo(Incident.Severity.HIGH);

		assertThat(incident.status())
				.isEqualTo(Incident.Status.OPEN);

		assertThat(incident.latitude())
				.isEqualByComparingTo("1.2966");

		assertThat(incident.longitude())
				.isEqualByComparingTo("103.7764");

		assertThat(incident.locationText())
				.isEqualTo("Test Elder Home");

		assertThat(incident.description())
				.isEqualTo("EL03 emergency call test");

		assertThat(incident.respondBy()).isNull();

		assertThat(incident.reportedAt())
				.isBetween(before, after);

		assertThat(incident.resolvedAt()).isNull();
	}

	@Test
	@DisplayName("elder SOS allows optional location and description fields to be absent")
	void createsElderSosWithoutOptionalDetails() {
		Incident incident = Incident.createElderSos(
				1L,
				7L,
				null,
				null,
				null,
				null);

		assertThat(incident.elderId()).isEqualTo(1L);
		assertThat(incident.reportedByUserId()).isEqualTo(7L);

		assertThat(incident.latitude()).isNull();
		assertThat(incident.longitude()).isNull();
		assertThat(incident.locationText()).isNull();
		assertThat(incident.description()).isNull();

		assertThat(incident.source())
				.isEqualTo(Incident.Source.ELDER_SOS);

		assertThat(incident.category())
				.isEqualTo(Incident.Category.SOS);

		assertThat(incident.severity())
				.isEqualTo(Incident.Severity.HIGH);

		assertThat(incident.status())
				.isEqualTo(Incident.Status.OPEN);
	}

	@Test
	@DisplayName("elder SOS requires an elder id")
	void rejectsElderSosWithoutElderId() {
		assertThatThrownBy(() ->
				Incident.createElderSos(
						null,
						7L,
						null,
						null,
						"Somewhere",
						"Help"))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessage("elderId must not be null");
	}
}