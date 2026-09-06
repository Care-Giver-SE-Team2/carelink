package sg.nus.carelink.visit.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.visit.domain.model.Visit;

class VisitServiceTest {

	private final InMemoryVisitRepository repository = new InMemoryVisitRepository();
	private final VisitService service = new VisitService(repository);

	@Test
	void findsWhatWasSaved() {
		Visit saved = repository.save(new Visit(
				null,
				2L,
				3L,
				4L,
				5L,
				"v6",
				LocalDateTime.of(2026, 9, 6, 10, 7),
				LocalDateTime.of(2026, 9, 6, 10, 8),
				LocalDateTime.of(2026, 9, 6, 10, 9),
				LocalDateTime.of(2026, 9, 6, 10, 10),
				Visit.Status.SCHEDULED,
				LocalDateTime.of(2026, 9, 6, 10, 12),
				13L,
				14,
				LocalDateTime.of(2026, 9, 6, 10, 15),
				LocalDateTime.of(2026, 9, 6, 10, 16)));

		assertThat(service.findVisit(saved.id())).contains(saved);
	}

	@Test
	void isEmptyForAnUnknownId() {
		assertThat(service.findVisit(999L)).isEmpty();
	}
}
