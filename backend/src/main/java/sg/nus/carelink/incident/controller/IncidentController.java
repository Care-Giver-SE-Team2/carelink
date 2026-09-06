package sg.nus.carelink.incident.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.carelink.incident.application.IncidentService;
import sg.nus.carelink.incident.domain.model.Incident;

/**
 * Presentation layer of the incident module: HTTP in, HTTP out, status codes. No business
 * rules. Talks to IncidentService only, never to a repository (ArchUnit enforces it). Which role
 * may call each endpoint is declared on the method with @PreAuthorize.
 * identity.controller.AuthController is the template; use dto/ for request and response
 * shapes once they differ from the domain model.
 */
@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

	private final IncidentService service;

	public IncidentController(IncidentService service) {
		this.service = service;
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public ResponseEntity<Incident> get(@PathVariable Long id) {
		return ResponseEntity.of(service.findIncident(id));
	}
}
