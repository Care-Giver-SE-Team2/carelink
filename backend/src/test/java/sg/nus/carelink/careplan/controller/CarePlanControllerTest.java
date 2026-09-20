package sg.nus.carelink.careplan.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import sg.nus.carelink.careplan.application.CarePlanService;
import sg.nus.carelink.careplan.domain.model.CarePlan;
import sg.nus.carelink.identity.application.UserDirectory;
import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.shared.security.Role;

/** HTTP surface only: status codes for found and not found. Security is tested at the filter-chain level. */
class CarePlanControllerTest {

	private final CarePlanService service = mock(CarePlanService.class);
	private final UserDirectory users = mock(UserDirectory.class);
	private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new CarePlanController(service, users)).build();

	@Test
	void returns200WithTheRecord() throws Exception {
		when(service.findCarePlan(1L)).thenReturn(Optional.of(new CarePlan(
				1L,
				2L,
				3L,
				4L,
				5,
				CarePlan.Status.DRAFT,
				new BigDecimal("7.5"),
				LocalDateTime.of(2026, 9, 6, 10, 8),
				LocalDateTime.of(2026, 9, 6, 10, 9),
				LocalDateTime.of(2026, 9, 6, 10, 10))));

		mvc.perform(get("/api/care-plans/1")).andExpect(status().isOk());
	}

	@Test
	void returns404WhenMissing() throws Exception {
		when(service.findCarePlan(2L)).thenReturn(Optional.empty());

		mvc.perform(get("/api/care-plans/2")).andExpect(status().isNotFound());
	}

	@Test
	void returns201WhenDraftIsCreated() throws Exception {
		AppUser actingUser = new AppUser(7L, "mei.ling", "Tan Mei Ling", Set.of(Role.MANAGER), true);
		when(users.findByUsername("mei.ling")).thenReturn(Optional.of(actingUser));
		when(service.createDraft(42L, 7L)).thenReturn(new CarePlan(
				1L, 42L, 7L, null, 1, CarePlan.Status.DRAFT, null, null, null, null));

		mvc.perform(post("/api/care-plans")
						.principal(new UsernamePasswordAuthenticationToken("mei.ling", null))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"elderId\":42}"))
				.andExpect(status().isCreated());
	}
}
