package sg.nus.carelink.shared.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

import jakarta.servlet.http.HttpServletResponse;

/**
 * Application-wide security configuration.
 *
 * <p>This class deliberately imports nothing from the identity module: the
 * UserDetailsService is injected by type. That keeps the dependency direction
 * identity -> shared one-way, so no cycle appears between modules (enforced by
 * the slice rule in LayerDependencyTest).
 *
 * <p>Session strategy: server-side session in an HttpOnly cookie, not a JWT.
 * This matches the proposal's positioning of a monolith without a separate API
 * gateway, and avoids the extra complexity of token revocation.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
				.authorizeHttpRequests(auth -> auth
						// Health probes must be reachable anonymously, otherwise the container
						// health check and the pipeline smoke test can never get a 200.
						.requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
						// Logging in cannot itself require a login.
						.requestMatchers("/api/auth/login").permitAll()
						// Front-end static assets.
						.requestMatchers("/", "/index.html", "/favicon.ico", "/assets/**", "/vite.svg").permitAll()
						.anyRequest().authenticated())
				// Same origin, so the CSRF token goes in a cookie for the front end to echo back in a header.
				.csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
				// No login form and no basic auth: /api/auth/login handles sign-in, and an
				// unauthenticated request gets a 401 rather than a redirect.
				.formLogin(AbstractHttpConfigurer::disable)
				.httpBasic(AbstractHttpConfigurer::disable)
				.exceptionHandling(ex -> ex.authenticationEntryPoint(
						(request, response, authException) ->
								response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
				.logout(logout -> logout
						.logoutUrl("/api/auth/logout")
						.logoutSuccessHandler((request, response, authentication) ->
								response.setStatus(HttpServletResponse.SC_NO_CONTENT))
						.deleteCookies("JSESSIONID"));
		return http.build();
	}

	/**
	 * Delegating encoder: stored hashes carry a {bcrypt} prefix, so changing the
	 * algorithm later does not require migrating existing rows.
	 */
	@Bean
	PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	@Bean
	AuthenticationManager authenticationManager(UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
		DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
		provider.setPasswordEncoder(passwordEncoder);
		return new ProviderManager(provider);
	}
}
