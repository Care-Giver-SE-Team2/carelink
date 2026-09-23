package sg.nus.carelink.visit.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import sg.nus.carelink.profile.application.CaregiverPublicProfile;
import sg.nus.carelink.visit.application.FamilyCaregiverQueryService;

/**
 * Checks path binding, session identity and public caregiver serialization.
 *
 * @author Wang Zhili
 */
class FamilyCaregiverControllerTest {

	private final FamilyCaregiverQueryService queries = mock(FamilyCaregiverQueryService.class);
	private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new FamilyCaregiverController(queries)).build();

	@Test
	void usesThePathAndAuthenticatedIdentityAndReturnsPublicFields() throws Exception {
		when(queries.getProfile("family-a", 201L))
				.thenReturn(new CaregiverPublicProfile(201L, "Lim Jia Hui", List.of("Mandarin", "Hokkien")));

		mvc.perform(get("/api/caregivers/201").principal(() -> "family-a")
				.param("caregiverId", "999").param("username", "family-b").param("role", "MANAGER"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(201))
				.andExpect(jsonPath("$.fullName").value("Lim Jia Hui"))
				.andExpect(jsonPath("$.dialects[0]").value("Mandarin"))
				.andExpect(jsonPath("$.dialects[1]").value("Hokkien"))
				.andExpect(jsonPath("$.phone").doesNotExist())
				.andExpect(jsonPath("$.status").doesNotExist());
		verify(queries).getProfile("family-a", 201L);
	}

	@Test
	void emptyLanguagesAreSerializedAsAnArray() throws Exception {
		when(queries.getProfile("family-a", 201L))
				.thenReturn(new CaregiverPublicProfile(201L, "Lim Jia Hui", List.of()));

		mvc.perform(get("/api/caregivers/201").principal(() -> "family-a"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.dialects").isArray())
				.andExpect(jsonPath("$.dialects").isEmpty());
	}

	@ParameterizedTest
	@ValueSource(strings = { "abc", "null", "1.5", "9223372036854775808" })
	void malformedIdsAreRejectedBeforeQuerying(String id) throws Exception {
		mvc.perform(get("/api/caregivers/{caregiverId}", id).principal(() -> "family-a"))
				.andExpect(status().isBadRequest());
		verifyNoInteractions(queries);
	}
}
