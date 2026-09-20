package sg.nus.carelink.profile.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.careplan.application.CarePlanLookup;
import sg.nus.carelink.careplan.domain.model.CarePlan;
import sg.nus.carelink.profile.domain.model.Elder;

class ProfileServiceTest {

	private final InMemoryElderRepository repository = new InMemoryElderRepository();
	private final CarePlanLookup carePlans = mock(CarePlanLookup.class);
	private final ProfileService service = new ProfileService(repository, carePlans);

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

	@Test
	void listEldersJoinsInThePlanStatusFromCareplan() {
		Elder withDraft = repository.save(elder("v3"));
		Elder withNoPlan = repository.save(elder("v3b"));
		when(carePlans.findLatestByElderId(withDraft.id())).thenReturn(Optional.of(new CarePlan(
				1L, withDraft.id(), 9L, null, 2, CarePlan.Status.DRAFT,
				new BigDecimal("5.0"), null, LocalDateTime.now(), LocalDateTime.now())));
		when(carePlans.findLatestByElderId(withNoPlan.id())).thenReturn(Optional.empty());

		var summaries = service.listElders();

		assertThat(summaries).hasSize(2);
		assertThat(summaries)
				.filteredOn(s -> s.elder().id().equals(withDraft.id()))
				.singleElement()
				.satisfies(s -> {
					assertThat(s.planStatus()).isEqualTo("draft");
					assertThat(s.planVersion()).isEqualTo(2);
				});
		assertThat(summaries)
				.filteredOn(s -> s.elder().id().equals(withNoPlan.id()))
				.singleElement()
				.satisfies(s -> {
					assertThat(s.planStatus()).isEqualTo("none");
					assertThat(s.planVersion()).isNull();
				});
	}

	private static Elder elder(String fullName) {
		return new Elder(
				null, 2L, fullName, Elder.Gender.MALE, LocalDate.of(2026, 9, 6), "v6", "v7", "v8", "v9",
				"v10", Boolean.TRUE, Elder.MobilityLevel.INDEPENDENT, Elder.ContinuityPreference.PREFERRED,
				"v14", LocalDateTime.of(2026, 9, 6, 10, 15), LocalDateTime.of(2026, 9, 6, 10, 16));
	}
}
