package sg.nus.carelink.report.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.carelink.report.application.ReportService;
import sg.nus.carelink.report.domain.model.Report;

/**
 * Presentation layer of the report module: HTTP in, HTTP out, status codes. No business
 * rules. Talks to ReportService only, never to a repository (ArchUnit enforces it). Which role
 * may call each endpoint is declared on the method with @PreAuthorize.
 * identity.controller.AuthController is the template; use dto/ for request and response
 * shapes once they differ from the domain model.
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

	private final ReportService service;

	public ReportController(ReportService service) {
		this.service = service;
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public ResponseEntity<Report> get(@PathVariable Long id) {
		return ResponseEntity.of(service.findReport(id));
	}
}
