package sg.nus.carelink.profile.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.carelink.profile.application.ProfileService;
import sg.nus.carelink.profile.domain.model.Elder;

/**
 * Presentation layer of the profile module: HTTP in, HTTP out, status codes. No business
 * rules. Talks to ProfileService only, never to a repository (ArchUnit enforces it). Which role
 * may call each endpoint is declared on the method with @PreAuthorize.
 * identity.controller.AuthController is the template; use dto/ for request and response
 * shapes once they differ from the domain model.
 */
@RestController
@RequestMapping("/api/elders")
public class ProfileController {

	private final ProfileService service;

	public ProfileController(ProfileService service) {
		this.service = service;
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public ResponseEntity<Elder> get(@PathVariable Long id) {
		return ResponseEntity.of(service.findElder(id));
	}
}
