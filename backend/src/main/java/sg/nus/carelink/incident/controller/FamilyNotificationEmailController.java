package sg.nus.carelink.incident.controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.nus.carelink.incident.application.FamilyNotificationEmailService;
import sg.nus.carelink.incident.domain.model.FamilyNotificationEmail;
import sg.nus.carelink.incident.domain.model.Incident;

/** Only the current family's contact status leaves this API; no verification secrets.
 * @author Wang Zhili
 */
@RestController
@RequestMapping("/api/family/notification-email")
@PreAuthorize("hasRole('FAMILY')")
public class FamilyNotificationEmailController {
	private final FamilyNotificationEmailService service;
	public FamilyNotificationEmailController(FamilyNotificationEmailService service) { this.service = service; }
	@GetMapping public Status get(Principal principal) { return status(service.get(principal.getName())); }
	@PostMapping public Status request(@Valid @RequestBody Address body, Principal principal) {
		return status(service.request(principal.getName(), body.email()));
	}
	@PostMapping("/verify") public Status verify(@Valid @RequestBody Verification body, Principal principal) {
		return status(service.verify(principal.getName(), body.token()));
	}
	@DeleteMapping public Status remove(Principal principal) { return status(service.remove(principal.getName())); }
	public record Address(@NotBlank @Email @Size(max = 254) String email) {}
	public record Verification(@NotBlank @Pattern(regexp = "[a-f0-9]{64}") String token) {}
	public record Status(String email, OffsetDateTime verifiedAt, OffsetDateTime verificationExpiresAt, boolean configured, boolean urgentAlertsConfigured) {}
	private Status status(FamilyNotificationEmail value) {
		return new Status(value.email(), time(value.verifiedAt()), time(value.verificationExpiresAt()), service.configured(), service.urgentAlertsConfigured());
	}
	private OffsetDateTime time(LocalDateTime value) { return value == null ? null : value.atZone(Incident.CARELINK_ZONE).toOffsetDateTime(); }
}
