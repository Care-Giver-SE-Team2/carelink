package sg.nus.carelink.visit.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.security.access.AccessDeniedException;

import sg.nus.carelink.profile.application.CaregiverDirectory;
import sg.nus.carelink.profile.application.CaregiverPublicProfile;
import sg.nus.carelink.profile.application.FamilyAccessQuery;
import sg.nus.carelink.shared.error.ResourceNotFound;
import sg.nus.carelink.visit.domain.repository.VisitScheduleQuery;

/**
 * Verifies access checks precede caregiver data lookup and failures remain distinct.
 *
 * @author Wang Zhili
 */
class FamilyCaregiverQueryServiceTest {

	private final FamilyAccessQuery access = mock(FamilyAccessQuery.class);
	private final VisitScheduleQuery visits = mock(VisitScheduleQuery.class);
	private final CaregiverDirectory caregivers = mock(CaregiverDirectory.class);
	private final FamilyCaregiverQueryService service = new FamilyCaregiverQueryService(access, visits, caregivers);

	@Test
	void readsPublicDetailsOnlyAfterCheckingAllCurrentlyReadableElders() {
		var elderIds = Set.of(101L, 102L);
		var profile = new CaregiverPublicProfile(201L, "Lim Jia Hui", List.of("Mandarin"));
		when(access.readableElderIds("family-a")).thenReturn(elderIds);
		when(visits.hasAssignedVisit(elderIds, 201L)).thenReturn(true);
		when(caregivers.findPublicProfile(201L)).thenReturn(Optional.of(profile));

		assertThat(service.getProfile("family-a", 201L)).isEqualTo(profile);
		var ordered = inOrder(access, visits, caregivers);
		ordered.verify(access).readableElderIds("family-a");
		ordered.verify(visits).hasAssignedVisit(elderIds, 201L);
		ordered.verify(caregivers).findPublicProfile(201L);
	}

	@Test
	void unavailableFamilyStopsBeforeVisitOrProfileLookup() {
		when(access.readableElderIds("family-a")).thenThrow(new AccessDeniedException("Unavailable family"));

		assertThatThrownBy(() -> service.getProfile("family-a", 201L)).isInstanceOf(AccessDeniedException.class);
		verifyNoInteractions(visits, caregivers);
	}

	@Test
	void noReadableEldersCannotAccessAnyCaregiver() {
		when(access.readableElderIds("family-a")).thenReturn(Set.of());

		assertThatThrownBy(() -> service.getProfile("family-a", 201L)).isInstanceOf(AccessDeniedException.class);
		verifyNoInteractions(visits, caregivers);
	}

	@Test
	void unrelatedCaregiverIsRejectedWithoutLookingUpWhetherTheirProfileExists() {
		when(access.readableElderIds("family-a")).thenReturn(Set.of(101L));
		when(visits.hasAssignedVisit(Set.of(101L), 999L)).thenReturn(false);

		assertThatThrownBy(() -> service.getProfile("family-a", 999L)).isInstanceOf(AccessDeniedException.class);
		verifyNoInteractions(caregivers);
	}

	@Test
	void missingProfileAfterAuthorizationIsReportedAsNotFound() {
		allowCaregiver();
		when(caregivers.findPublicProfile(201L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.getProfile("family-a", 201L))
				.isInstanceOf(ResourceNotFound.class).hasMessage("Caregiver [201] does not exist");
	}

	@Test
	void failedRelationshipLookupDoesNotExposeProfileData() {
		when(access.readableElderIds("family-a")).thenReturn(Set.of(101L));
		when(visits.hasAssignedVisit(Set.of(101L), 201L))
				.thenThrow(new DataAccessResourceFailureException("Unavailable"));

		assertThatThrownBy(() -> service.getProfile("family-a", 201L))
				.isInstanceOf(DataAccessResourceFailureException.class);
		verifyNoInteractions(caregivers);
	}

	@Test
	void failedProfileLookupIsNotReportedAsMissingOrForbidden() {
		allowCaregiver();
		when(caregivers.findPublicProfile(201L)).thenThrow(new DataAccessResourceFailureException("Unavailable"));

		assertThatThrownBy(() -> service.getProfile("family-a", 201L))
				.isInstanceOf(DataAccessResourceFailureException.class);
	}

	private void allowCaregiver() {
		when(access.readableElderIds("family-a")).thenReturn(Set.of(101L));
		when(visits.hasAssignedVisit(Set.of(101L), 201L)).thenReturn(true);
	}
}
