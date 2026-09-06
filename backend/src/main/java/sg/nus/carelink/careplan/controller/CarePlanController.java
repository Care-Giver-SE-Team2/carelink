package sg.nus.carelink.careplan.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.carelink.careplan.application.CarePlanService;
import sg.nus.carelink.careplan.domain.model.CarePlan;

/**
 * Presentation layer of the careplan module: HTTP in, HTTP out, status codes. No business
 * rules. Talks to CarePlanService only, never to a repository (ArchUnit enforces it). Which role
 * may call each endpoint is declared on the method with @PreAuthorize.
 * identity.controller.AuthController is the template; use dto/ for request and response
 * shapes once they differ from the domain model.
 */
@RestController
@RequestMapping("/api/care-plans")
public class CarePlanController {

	private final CarePlanService service;

	public CarePlanController(CarePlanService service) {
		this.service = service;
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public ResponseEntity<CarePlan> get(@PathVariable Long id) {
		return ResponseEntity.of(service.findCarePlan(id));
	}
}
