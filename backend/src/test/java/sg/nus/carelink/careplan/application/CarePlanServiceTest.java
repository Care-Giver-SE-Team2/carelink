package sg.nus.carelink.careplan.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.careplan.domain.model.CarePlan;

class CarePlanServiceTest {

	private final InMemoryCarePlanRepository repository = new InMemoryCarePlanRepository();
	private final CarePlanService service = new CarePlanService(repository);

	@Test
	void findsWhatWasSaved() {
		CarePlan saved = repository.save(new CarePlan(
				null,
				2L,
				3L,
				4L,
				5,
				CarePlan.Status.DRAFT,
				new BigDecimal("7.5"),
				LocalDateTime.of(2026, 9, 6, 10, 8),
				LocalDateTime.of(2026, 9, 6, 10, 9),
				LocalDateTime.of(2026, 9, 6, 10, 10)));

		assertThat(service.findCarePlan(saved.id())).contains(saved);
	}

	@Test
	void isEmptyForAnUnknownId() {
		assertThat(service.findCarePlan(999L)).isEmpty();
	}
}
