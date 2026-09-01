package sg.nus.carelink.identity.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import sg.nus.carelink.identity.application.IdentityService;
import sg.nus.carelink.identity.controller.dto.CurrentUserResponse;
import sg.nus.carelink.identity.controller.dto.LoginRequest;

/**
 * Presentation layer: HTTP in, HTTP out, status codes. No business rules.
 *
 * <p>Logout is handled by Spring Security's logout filter (see SecurityConfig)
 * and is deliberately not reimplemented here.
 */
@RestController
@RequestMapping("/api/auth")
class AuthController {

	private final IdentityService identityService;
	private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

	AuthController(IdentityService identityService) {
		this.identityService = identityService;
	}

	@PostMapping("/login")
	CurrentUserResponse login(@Valid @RequestBody LoginRequest request,
			HttpServletRequest httpRequest, HttpServletResponse httpResponse) {

		Authentication authentication = identityService.authenticate(request.username(), request.password());

		// Persist the security context in the session; subsequent requests are
		// identified by the JSESSIONID cookie.
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authentication);
		SecurityContextHolder.setContext(context);
		contextRepository.saveContext(context, httpRequest, httpResponse);

		return CurrentUserResponse.from(identityService.require(authentication.getName()));
	}

	@GetMapping("/me")
	CurrentUserResponse me(Authentication authentication) {
		return CurrentUserResponse.from(identityService.require(authentication.getName()));
	}

	@ExceptionHandler(BadCredentialsException.class)
	@ResponseStatus(HttpStatus.UNAUTHORIZED)
	void onBadCredentials() {
		// No reason is returned. "No such account" and "wrong password" are not
		// distinguished, so the endpoint cannot be used to enumerate accounts.
	}
}
