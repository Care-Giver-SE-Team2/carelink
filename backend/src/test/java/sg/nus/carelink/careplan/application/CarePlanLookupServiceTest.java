package sg.nus.carelink.careplan.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.careplan.domain.model.CarePlan;

/** The cross-module contract just delegates to the repository port; nothing else. */
class CarePlanLookupServiceTest {

	private final InMemoryCarePlanRepository repository = new InMemoryCarePlanRepository();
	private final CarePlanLookup lookup = new CarePlanLookupService(repository);

	@Test
	void findsTheElderSLatestPlan() {
		CarePlan saved = repository.save(new CarePlan(
				null, 42L, 7L, null, 1, CarePlan.Status.DRAFT, new BigDecimal("7.5"),
				null, LocalDateTime.of(2026, 9, 6, 10, 8), LocalDateTime.of(2026, 9, 6, 10, 9)));

		assertThat(lookup.findLatestByElderId(42L)).contains(saved);
	}

	@Test
	void isEmptyWhenTheElderHasNoPlanYet() {
		assertThat(lookup.findLatestByElderId(999L)).isEmpty();
	}
}
