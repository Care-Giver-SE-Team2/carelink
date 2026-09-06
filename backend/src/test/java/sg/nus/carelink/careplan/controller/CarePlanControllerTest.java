package sg.nus.carelink.careplan.controller;

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

import sg.nus.carelink.careplan.application.CarePlanService;
import sg.nus.carelink.careplan.domain.model.CarePlan;

/** HTTP surface only: status codes for found and not found. Security is tested at the filter-chain level. */
class CarePlanControllerTest {

	private final CarePlanService service = mock(CarePlanService.class);
	private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new CarePlanController(service)).build();

	@Test
	void returns200WithTheRecord() throws Exception {
		when(service.findCarePlan(1L)).thenReturn(Optional.of(new CarePlan(
				1L,
				2L,
				3L,
				4L,
				5,
				CarePlan.Status.DRAFT,
				new BigDecimal("7.5"),
				LocalDateTime.of(2026, 9, 6, 10, 8),
				LocalDateTime.of(2026, 9, 6, 10, 9),
				LocalDateTime.of(2026, 9, 6, 10, 10))));

		mvc.perform(get("/api/care-plans/1")).andExpect(status().isOk());
	}

	@Test
	void returns404WhenMissing() throws Exception {
		when(service.findCarePlan(2L)).thenReturn(Optional.empty());

		mvc.perform(get("/api/care-plans/2")).andExpect(status().isNotFound());
	}
}
