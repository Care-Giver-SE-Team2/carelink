package sg.nus.carelink.profile.infrastructure.event;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.careplan.application.CarePlanPublished;
import sg.nus.carelink.profile.application.ServiceApplicationPlannedRecorder;
import sg.nus.carelink.profile.application.ServiceApplicationSubmitted;

class ServiceApplicationPlannedListenerTest {

	private final ServiceApplicationPlannedRecorder recorder = mock(ServiceApplicationPlannedRecorder.class);
	private final ServiceApplicationPlannedListener listener = new ServiceApplicationPlannedListener(recorder);

	@Test
	void recordsForTheElderAfterAPublishAndAfterASubmission() {
		listener.onCarePlanPublished(new CarePlanPublished(5L, 70L, 2, LocalDate.of(2026, 10, 5)));
		listener.onServiceApplicationSubmitted(new ServiceApplicationSubmitted(12L, 6L, 1));

		verify(recorder).recordFor(5L);
		verify(recorder).recordFor(6L);
	}

	@Test
	void aFailureDoesNotEscapeTheListener() {
		doThrow(new IllegalStateException("database down")).when(recorder).recordFor(5L);

		listener.onCarePlanPublished(new CarePlanPublished(5L, 70L, 2, LocalDate.of(2026, 10, 5)));
	}
}
