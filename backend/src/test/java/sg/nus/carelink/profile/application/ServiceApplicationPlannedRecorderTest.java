package sg.nus.carelink.profile.application;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.careplan.application.CarePlanSchedules;
import sg.nus.carelink.careplan.application.CarePlanSchedules.PlanSchedule;
import sg.nus.carelink.careplan.application.CarePlanSchedules.Task;
import sg.nus.carelink.profile.domain.model.ElderBasicDetails;
import sg.nus.carelink.profile.domain.model.ServiceApplication;
import sg.nus.carelink.profile.domain.repository.ServiceApplicationRepository;

class ServiceApplicationPlannedRecorderTest {

	private final ServiceApplicationRepository applications = mock(ServiceApplicationRepository.class);
	private final CarePlanSchedules schedules = mock(CarePlanSchedules.class);
	private final Clock clock = Clock.fixed(Instant.parse("2026-10-10T02:00:00Z"), ZoneId.of("Asia/Singapore"));
	private final ServiceApplicationPlannedRecorder recorder = new ServiceApplicationPlannedRecorder(
			applications, new CareRequestProgress(schedules), clock);

	@Test
	void recordsOnlyTheApplicationsThePlanNowFullyAnswers() {
		when(applications.findUnansweredByElderIds(Set.of(5L))).thenReturn(List.of(
				application(1L, "BATHING"), application(2L, "BATHING", "LIGHT_EXERCISE")));
		when(schedules.forElder(5L)).thenReturn(List.of(new PlanSchedule(70L, 5L, 2, LocalDate.of(2026, 10, 5), null,
				List.of(new Task(1L, "Personal care", "BATHING", "Bathing assistance", List.of())))));

		recorder.recordFor(5L);

		verify(applications).recordPlanned(Set.of(1L), LocalDateTime.of(2026, 10, 10, 2, 0));
	}

	@Test
	void readsNoPlansWhenNothingIsWaiting() {
		when(applications.findUnansweredByElderIds(Set.of(5L))).thenReturn(List.of());

		recorder.recordFor(5L);

		verifyNoInteractions(schedules);
		verify(applications, never()).recordPlanned(any(), any());
	}

	private static ServiceApplication application(Long id, String... needs) {
		return new ServiceApplication(id, 42L, 5L,
				new ElderBasicDetails("Tan Mei", null, null, null, "Road", "123456", null, null, null),
				List.of(needs), null, ServiceApplication.Status.SUBMITTED, LocalDateTime.of(2026, 10, 1, 9, 0));
	}
}
