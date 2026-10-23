package sg.nus.carelink.rostering.controller;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import sg.nus.carelink.rostering.application.ManagerReassignmentService;
import sg.nus.carelink.rostering.application.VisitCover;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.security.Role;
import sg.nus.carelink.shared.web.GlobalExceptionHandlerTestSupport;

/** The HTTP surface of a manager reassigning a visit: paths, bodies, status codes. */
class VisitReassignmentControllerTest {

	private static final AppUser MANAGER = new AppUser(11L, "alice", "Alice Tan", Set.of(Role.MANAGER), true);

	private final ManagerReassignmentService reassignments = mock(ManagerReassignmentService.class);
	private final IdentityService identity = mock(IdentityService.class);

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new VisitReassignmentController(reassignments, identity))
				.setControllerAdvice(GlobalExceptionHandlerTestSupport.instance())
				.build();
		when(identity.require(anyString())).thenReturn(MANAGER);
	}

	@Test
	void listsWhoCouldTakeTheVisit() throws Exception {
		when(reassignments.options(40L)).thenReturn(List.of(new VisitCover.Option(10L, "Siti", 1, "Free all morning"),
				new VisitCover.Option(5L, "Aisha", null, "Busy with another visit")));

		mvc.perform(get("/api/visits/40/reassignment-options").with(as("alice")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].name").value("Siti"))
				.andExpect(jsonPath("$[0].eligible").value(true))
				.andExpect(jsonPath("$[1].eligible").value(false));
	}

	@Test
	void reassigningReturns204InTheManagersName() throws Exception {
		mvc.perform(post("/api/visits/40/reassignment").with(as("alice")).contentType(MediaType.APPLICATION_JSON)
						.content("{\"caregiverId\":10,\"reason\":\"Farah is unwell\"}"))
				.andExpect(status().isNoContent());

		verify(reassignments).reassign(40L, 10L, "Farah is unwell", 11L);
	}

	@Test
	void aReassignmentWithoutAReasonIsABadRequest() throws Exception {
		mvc.perform(post("/api/visits/40/reassignment").with(as("alice")).contentType(MediaType.APPLICATION_JSON)
						.content("{\"caregiverId\":10,\"reason\":\"\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void aCaregiverAHardRuleExcludesIsAConflict() throws Exception {
		doThrow(new BusinessRuleViolation("CAREGIVER_CANNOT_TAKE_VISIT", "Aisha cannot take this visit"))
				.when(reassignments).reassign(40L, 5L, "swap", 11L);

		mvc.perform(post("/api/visits/40/reassignment").with(as("alice")).contentType(MediaType.APPLICATION_JSON)
						.content("{\"caregiverId\":5,\"reason\":\"swap\"}"))
				.andExpect(status().isConflict());
	}

	@Test
	void cancellingReturns204InTheManagersName() throws Exception {
		mvc.perform(post("/api/visits/40/cancellation").with(as("alice")).contentType(MediaType.APPLICATION_JSON)
						.content("{\"reason\":\"Mdm Tan is at the hospital\"}"))
				.andExpect(status().isNoContent());

		verify(reassignments).cancel(40L, "Mdm Tan is at the hospital", 11L);
	}

	@Test
	void aCancellationWithoutAReasonIsABadRequest() throws Exception {
		mvc.perform(post("/api/visits/40/cancellation").with(as("alice")).contentType(MediaType.APPLICATION_JSON)
						.content("{\"reason\":\" \"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void cancellingAVisitAnAbsenceStillAnswersForIsAConflict() throws Exception {
		doThrow(new BusinessRuleViolation("VISIT_IN_ABSENCE", "Settle it on the Absences screen"))
				.when(reassignments).cancel(42L, "Not needed", 11L);

		mvc.perform(post("/api/visits/42/cancellation").with(as("alice")).contentType(MediaType.APPLICATION_JSON)
						.content("{\"reason\":\"Not needed\"}"))
				.andExpect(status().isConflict());
	}

	private static RequestPostProcessor as(String username) {
		return request -> {
			request.setUserPrincipal(() -> username);
			return request;
		};
	}
}
