package sg.nus.carelink.visit.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
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

	@GetMapping("/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public ResponseEntity<Visit> get(@PathVariable Long id) {
		return ResponseEntity.of(service.findVisit(id));
	}
}
