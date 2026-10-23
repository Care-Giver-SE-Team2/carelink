package sg.nus.carelink.report.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import sg.nus.carelink.report.application.ReportExportService;
import sg.nus.carelink.report.application.ReportExportUnavailable;
import sg.nus.carelink.shared.error.ResourceNotFound;
import sg.nus.carelink.shared.web.GlobalExceptionHandlerTestSupport;

/**
 * {@code GET /api/reports/{id}/export} as the contract publishes it: a PDF attachment named by
 * the report's number, 404 for a report that is not there, 503 when the file cannot be drawn.
 *
 * <p>Standalone MockMvc with the real exception handler; who may call it is checked on the
 * annotation, as the other report endpoints are.
 */
class ReportExportControllerTest {

	private static final byte[] PDF = "%PDF-1.7 report".getBytes(StandardCharsets.US_ASCII);

	private final ReportExportService exports = mock(ReportExportService.class);

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new ReportExportController(exports))
				.setControllerAdvice(GlobalExceptionHandlerTestSupport.instance())
				.build();
	}

	@Test
	void theReportComesAsAPdfAttachmentNamedByItsNumberAndIsNeverCached() throws Exception {
		when(exports.exportPdf(42L)).thenReturn(PDF);

		mvc.perform(get("/api/reports/42/export"))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_PDF))
				.andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"care-report-42.pdf\""))
				.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
				.andExpect(content().bytes(PDF));
	}

	@Test
	void aReportThatIsNotThereIs404() throws Exception {
		when(exports.exportPdf(99L)).thenThrow(new ResourceNotFound("Report", 99L));

		mvc.perform(get("/api/reports/99/export")).andExpect(status().isNotFound());
	}

	@Test
	void aFileThatCannotBeDrawnIs503AndSaysTheReportIsUnaffected() throws Exception {
		when(exports.exportPdf(42L)).thenThrow(new ReportExportUnavailable(42L, new IOException("disk full")));

		mvc.perform(get("/api/reports/42/export"))
				.andExpect(status().isServiceUnavailable())
				.andExpect(jsonPath("$.title").value("Report export unavailable"))
				.andExpect(jsonPath("$.detail").value(containsString("The report itself is unchanged")))
				.andExpect(jsonPath("$.detail").value(containsString("try the export again")));
	}

	@Test
	void anIdThatIsNotANumberIs400AndNothingIsDrawn() throws Exception {
		mvc.perform(get("/api/reports/abc/export")).andExpect(status().isBadRequest());

		verify(exports, never()).exportPdf(any());
	}

	@Test
	void onlyAManagerMayExport() throws Exception {
		Method export = ReportExportController.class.getMethod("export", Long.class);

		PreAuthorize rule = AnnotatedElementUtils.findMergedAnnotation(export, PreAuthorize.class);

		assertThat(rule).isNotNull();
		assertThat(rule.value()).isEqualTo("hasRole('MANAGER')");
	}
}
