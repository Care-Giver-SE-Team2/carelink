package sg.nus.carelink.incident.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import sg.nus.carelink.incident.application.IncidentService;
import sg.nus.carelink.incident.domain.model.Incident;

/** HTTP surface only: status codes for found and not found. Security is tested at the filter-chain level. */
class IncidentControllerTest {

	private final IncidentService service = mock(IncidentService.class);
	private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new IncidentController(service)).build();

	@Test
	void returns200WithTheRecord() throws Exception {
		when(service.findIncident(1L)).thenReturn(Optional.of(new Incident(
				1L,
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
				LocalDateTime.of(2026, 9, 6, 10, 16))));

		mvc.perform(get("/api/incidents/1")).andExpect(status().isOk());
	}

	@Test
	void returns404WhenMissing() throws Exception {
		when(service.findIncident(2L)).thenReturn(Optional.empty());

		mvc.perform(get("/api/incidents/2")).andExpect(status().isNotFound());
	}
}
