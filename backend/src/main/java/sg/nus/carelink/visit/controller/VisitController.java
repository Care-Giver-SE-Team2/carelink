package sg.nus.carelink.visit.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.carelink.visit.application.VisitService;
import sg.nus.carelink.visit.domain.model.Visit;

/**
 * Presentation layer of the visit module: HTTP in, HTTP out, status codes. No business
 * rules. Talks to VisitService only, never to a repository (ArchUnit enforces it). Which role
 * may call each endpoint is declared on the method with @PreAuthorize.
 * identity.controller.AuthController is the template; use dto/ for request and response
 * shapes once they differ from the domain model.
 */
@RestController
@RequestMapping("/api/visits")
public class VisitController {

	private final VisitService service;

	public VisitController(VisitService service) {
		this.service = service;
	}

	/**
	 * The day roster for the manager's Today board; {@code date} defaults to today. Not the
	 * bare collection path, which is the family portal's visit list (FamilyVisitController).
	 */
	@GetMapping("/roster")
	@PreAuthorize("hasRole('MANAGER')")
	public List<Visit> dayRoster(
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return service.findDayRoster(date);
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public ResponseEntity<Visit> get(@PathVariable Long id) {
		return ResponseEntity.of(service.findVisit(id));
	}
}
