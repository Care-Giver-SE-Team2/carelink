package sg.nus.carelink.profile.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.profile.domain.model.Elder;

class ProfileServiceTest {

	private final InMemoryElderRepository repository = new InMemoryElderRepository();
	private final ProfileService service = new ProfileService(repository);

	@Test
	void findsWhatWasSaved() {
		Elder saved = repository.save(new Elder(
				null,
				2L,
				"v3",
				Elder.Gender.MALE,
				LocalDate.of(2026, 9, 6),
				"v6",
				"v7",
				"v8",
				"v9",
				"v10",
				Boolean.TRUE,
				Elder.MobilityLevel.INDEPENDENT,
				Elder.ContinuityPreference.PREFERRED,
				"v14",
				LocalDateTime.of(2026, 9, 6, 10, 15),
				LocalDateTime.of(2026, 9, 6, 10, 16)));

		assertThat(service.findElder(saved.id())).contains(saved);
	}

	@Test
	void isEmptyForAnUnknownId() {
		assertThat(service.findElder(999L)).isEmpty();
	}
}
