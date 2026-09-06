package sg.nus.carelink.report.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import sg.nus.carelink.report.application.ReportService;
import sg.nus.carelink.report.domain.model.Report;

/** HTTP surface only: status codes for found and not found. Security is tested at the filter-chain level. */
class ReportControllerTest {

	private final ReportService service = mock(ReportService.class);
	private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new ReportController(service)).build();

	@Test
	void returns200WithTheRecord() throws Exception {
		when(service.findReport(1L)).thenReturn(Optional.of(new Report(
				1L,
				2L,
				3L,
				Report.Audience.FAMILY,
				LocalDate.of(2026, 9, 6),
				LocalDate.of(2026, 9, 7),
				Report.Status.DRAFT,
				"v8",
				LocalDateTime.of(2026, 9, 6, 10, 9))));

		mvc.perform(get("/api/reports/1")).andExpect(status().isOk());
	}

	@Test
	void returns404WhenMissing() throws Exception {
		when(service.findReport(2L)).thenReturn(Optional.empty());

		mvc.perform(get("/api/reports/2")).andExpect(status().isNotFound());
	}
}
