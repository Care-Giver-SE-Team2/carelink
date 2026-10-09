package sg.nus.carelink.rostering.controller;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import sg.nus.carelink.identity.application.IdentityService;
import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.rostering.application.OpenVisitService;
import sg.nus.carelink.rostering.domain.service.Shortlist;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.error.ResourceNotFound;
import sg.nus.carelink.shared.security.Role;
import sg.nus.carelink.shared.web.GlobalExceptionHandlerTestSupport;

/** The HTTP surface of UC-MG03 on a visit nobody holds: paths, bodies, status codes. */
class OpenVisitControllerTest {

	private static final AppUser MANAGER = new AppUser(11L, "alice", "Alice Tan", Set.of(Role.MANAGER), true);
	private static final Shortlist.Verdict FARAH = new Shortlist.Verdict(9L, "Farah", 1, new BigDecimal("80.00"),
			"Visited Mdm Tan 3 times", null, List.of());
	private static final Shortlist.Verdict SITI = new Shortlist.Verdict(10L, "Siti", null, null,
			"Booked 14:00-15:00", "NO_TIME_CLASH", List.of());

	private final OpenVisitService openVisits = mock(OpenVisitService.class);
	private final IdentityService identity = mock(IdentityService.class);

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new OpenVisitController(openVisits, identity))
				.setControllerAdvice(GlobalExceptionHandlerTestSupport.instance())
				.build();
		when(identity.require(anyString())).thenReturn(MANAGER);
	}

	@Test
	void listsEveryCandidateWithWhyTheyRankOrAreExcluded() throws Exception {
		when(openVisits.candidates(40L)).thenReturn(List.of(FARAH, SITI));

		mvc.perform(get("/api/open-visits/40/candidates").with(as("alice")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].name").value("Farah"))
				.andExpect(jsonPath("$[0].rank").value(1))
				.andExpect(jsonPath("$[0].excludedBy").isEmpty())
				.andExpect(jsonPath("$[1].excludedBy").value("NO_TIME_CLASH"))
				.andExpect(jsonPath("$[1].reason").value("Booked 14:00-15:00"));
	}

	@Test
	void assigningReturnsWhoIsNowOnTheVisit() throws Exception {
		when(openVisits.assign(40L, 9L, 11L)).thenReturn(FARAH);

		mvc.perform(post("/api/open-visits/40/assignment").with(as("alice")).contentType(MediaType.APPLICATION_JSON)
						.content("{\"caregiverId\":9}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.visitId").value(40))
				.andExpect(jsonPath("$.caregiverId").value(9))
				.andExpect(jsonPath("$.caregiverName").value("Farah"));
	}

	@Test
	void aMissingCaregiverIsABadRequest() throws Exception {
		mvc.perform(post("/api/open-visits/40/assignment").with(as("alice")).contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void aVisitNoLongerOpenIsAConflictAndAMissingOneNotFound() throws Exception {
		when(openVisits.assign(40L, 10L, 11L))
				.thenThrow(new BusinessRuleViolation("CAREGIVER_CANNOT_TAKE_VISIT", "Siti cannot take this visit"));
		when(openVisits.candidates(404L)).thenThrow(new ResourceNotFound("Visit", 404L));

		mvc.perform(post("/api/open-visits/40/assignment").with(as("alice")).contentType(MediaType.APPLICATION_JSON)
						.content("{\"caregiverId\":10}"))
				.andExpect(status().isConflict());
		mvc.perform(get("/api/open-visits/404/candidates").with(as("alice"))).andExpect(status().isNotFound());
	}

	private static RequestPostProcessor as(String username) {
		return request -> {
			request.setUserPrincipal(() -> username);
			return request;
		};
	}
}
