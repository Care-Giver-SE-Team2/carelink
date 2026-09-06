package sg.nus.carelink.shared.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import sg.nus.carelink.identity.application.IdentityService;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the actual {@link SecurityFilterChain} rather than restating them, so a
 * rule that silently stops matching (a typo'd path, a reordered matcher) fails here
 * instead of only being noticed in a browser.
 */
@WebMvcTest
@Import(SecurityConfig.class)
class SecurityConfigTest {

	@Autowired
	private MockMvc mockMvc;

	// Neither bean is exercised: they only exist to satisfy SecurityConfig's and
	// AuthController's constructors so the web application context can start.
	@MockitoBean
	private UserDetailsService userDetailsService;

	@MockitoBean
	private IdentityService identityService;

	@Test
	void permitsAnonymousAccessToTheApiDocs() throws Exception {
		mockMvc.perform(get("/docs/index.html")).andExpect(status().isOk());
	}

	@Test
	void permitsAnonymousAccessToTheOpenApiContract() throws Exception {
		mockMvc.perform(get("/openapi.yaml")).andExpect(status().isOk());
	}

	@Test
	void permitsAnonymousAccessToTheDraftOpenApiContract() throws Exception {
		mockMvc.perform(get("/openapi-draft.yaml")).andExpect(status().isOk());
	}

	@Test
	void requiresAuthenticationForEverythingElse() throws Exception {
		mockMvc.perform(get("/api/some-protected-resource")).andExpect(status().isUnauthorized());
	}
}
