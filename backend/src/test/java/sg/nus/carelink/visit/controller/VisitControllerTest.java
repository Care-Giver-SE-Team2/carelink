package sg.nus.carelink.visit.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import sg.nus.carelink.visit.application.VisitService;
import sg.nus.carelink.visit.domain.model.Visit;

/** HTTP surface only: status codes for found and not found. Security is tested at the filter-chain level. */
class VisitControllerTest {

	private final VisitService service = mock(VisitService.class);
	private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new VisitController(service)).build();

	@Test
	void returns200WithTheRecord() throws Exception {
		when(service.findVisit(1L)).thenReturn(Optional.of(new Visit(
				1L,
				2L,
				3L,
				4L,
				5L,
				"v6",
				LocalDateTime.of(2026, 9, 6, 10, 7),
				LocalDateTime.of(2026, 9, 6, 10, 8),
				LocalDateTime.of(2026, 9, 6, 10, 9),
				LocalDateTime.of(2026, 9, 6, 10, 10),
				Visit.Status.SCHEDULED,
				LocalDateTime.of(2026, 9, 6, 10, 12),
				13L,
				14,
				LocalDateTime.of(2026, 9, 6, 10, 15),
				LocalDateTime.of(2026, 9, 6, 10, 16))));

		mvc.perform(get("/api/visits/1")).andExpect(status().isOk());
	}

	@Test
	void returns404WhenMissing() throws Exception {
		when(service.findVisit(2L)).thenReturn(Optional.empty());

		mvc.perform(get("/api/visits/2")).andExpect(status().isNotFound());
	}
}
