package sg.nus.carelink.report.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.carelink.report.application.ReportExportService;
import sg.nus.carelink.report.application.ReportExportUnavailable;

/**
 * HTTP for UC-MG07's export: {@code GET /api/reports/{id}/export}, a filed report as a PDF, as
 * {@code docs/api/openapi.yaml} publishes it.
 *
 * <p>Managers only. The contract also lets a family export its own reports (UC-FM04); that
 * branch belongs to the family's use case and is not opened here, so a family asking gets 403
 * until it is.
 *
 * <p>The file is drawn from the filed report every time and is never cached: what a manager
 * downloads is what is on file now, notes appended since included.
 */
@RestController
@RequestMapping("/api/reports")
public class ReportExportController {

	private static final Logger log = LoggerFactory.getLogger(ReportExportController.class);

	private final ReportExportService exports;

	public ReportExportController(ReportExportService exports) {
		this.exports = exports;
	}

	/** The report as an attachment named by its number only, never by anything about the elder. */
	@GetMapping("/{id}/export")
	@PreAuthorize("hasRole('MANAGER')")
	public ResponseEntity<byte[]> export(@PathVariable Long id) {
		byte[] pdf = exports.exportPdf(id);
		return ResponseEntity.ok()
				.contentType(MediaType.APPLICATION_PDF)
				.header(HttpHeaders.CONTENT_DISPOSITION,
						ContentDisposition.attachment().filename("care-report-" + id + ".pdf").build().toString())
				.cacheControl(CacheControl.noStore())
				.body(pdf);
	}

	/**
	 * 503, as the contract says: the report still reads online, and asking again is safe. Why the
	 * drawing failed goes to the log only, never back to the caller.
	 */
	@ExceptionHandler(ReportExportUnavailable.class)
	ProblemDetail onExportUnavailable(ReportExportUnavailable ex) {
		log.error("Report export failed", ex);
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,
				"The PDF could not be produced. The report itself is unchanged and can still be read; "
						+ "try the export again.");
		problem.setTitle("Report export unavailable");
		return problem;
	}
}
