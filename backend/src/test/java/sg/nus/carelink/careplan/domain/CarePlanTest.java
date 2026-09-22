package sg.nus.carelink.careplan.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.careplan.domain.model.CarePlan;
import sg.nus.carelink.shared.error.BusinessRuleViolation;

class CarePlanTest {

	@Test
	void startsVersionOneWithNoSupersedesWhenElderHasNoPriorPlan() {
		CarePlan draft = CarePlan.startDraft(10L, 99L, null);

		assertThat(draft.id()).isNull();
		assertThat(draft.elderId()).isEqualTo(10L);
		assertThat(draft.createdByUserId()).isEqualTo(99L);
		assertThat(draft.version()).isEqualTo(1);
		assertThat(draft.status()).isEqualTo(CarePlan.Status.DRAFT);
		assertThat(draft.supersedesPlanId()).isNull();
	}

	@Test
	void chainsSupersedesToTheLatestPublishedPlanAndBumpsVersion() {
		CarePlan published = new CarePlan(
				5L, 10L, 1L, null, 3, CarePlan.Status.PUBLISHED,
				new BigDecimal("12.0"), LocalDateTime.now(), LocalDateTime.now(), LocalDateTime.now());

		CarePlan draft = CarePlan.startDraft(10L, 99L, published);

		assertThat(draft.version()).isEqualTo(4);
		assertThat(draft.supersedesPlanId()).isEqualTo(5L);
	}

	@Test
	void rejectsANewDraftWhileOneIsAlreadyOpen() {
		CarePlan openDraft = new CarePlan(
				5L, 10L, 1L, null, 2, CarePlan.Status.DRAFT,
				null, null, LocalDateTime.now(), LocalDateTime.now());

		assertThatThrownBy(() -> CarePlan.startDraft(10L, 99L, openDraft))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(ex -> ((BusinessRuleViolation) ex).code())
				.isEqualTo("CARE_PLAN_DRAFT_ALREADY_OPEN");
	}

	@Test
	void publishingADraftSetsStatusAndPublishedAtAndTheGivenTotal() {
		CarePlan draft = new CarePlan(
				5L, 10L, 1L, null, 2, CarePlan.Status.DRAFT,
				null, null, LocalDateTime.now(), LocalDateTime.now());

		CarePlan published = draft.publish(LocalDate.of(2026, 4, 1), new BigDecimal("6.50"));

		assertThat(published.status()).isEqualTo(CarePlan.Status.PUBLISHED);
		assertThat(published.totalHours()).isEqualByComparingTo("6.50");
		assertThat(published.publishedAt()).isNotNull();
		assertThat(published.startDate()).isEqualTo(LocalDate.of(2026, 4, 1));
		assertThat(published.id()).isEqualTo(draft.id());
	}

	@Test
	void publishingWithoutAStartDateIsRejected() {
		CarePlan draft = new CarePlan(
				5L, 10L, 1L, null, 2, CarePlan.Status.DRAFT,
				null, null, LocalDateTime.now(), LocalDateTime.now());

		assertThatThrownBy(() -> draft.publish(null, new BigDecimal("6.50")))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(ex -> ((BusinessRuleViolation) ex).code())
				.isEqualTo("CARE_PLAN_START_DATE_REQUIRED");
	}

	@Test
	void publishingAPlanThatIsNotADraftIsRejected() {
		CarePlan alreadyPublished = new CarePlan(
				5L, 10L, 1L, null, 2, CarePlan.Status.PUBLISHED,
				new BigDecimal("6.50"), LocalDateTime.now(), LocalDateTime.now(), LocalDateTime.now());

		assertThatThrownBy(() -> alreadyPublished.publish(LocalDate.of(2026, 4, 1), new BigDecimal("7.00")))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(ex -> ((BusinessRuleViolation) ex).code())
				.isEqualTo("CARE_PLAN_NOT_DRAFT");
	}

	@Test
	void supersedeMarksAPublishedPlanAsSupersededAndKeepsItsStartDate() {
		CarePlan published = new CarePlan(
				5L, 10L, 1L, null, 2, CarePlan.Status.PUBLISHED,
				new BigDecimal("6.50"), LocalDateTime.now(), LocalDateTime.now(), LocalDateTime.now(),
				LocalDate.of(2026, 4, 1), null, null, null, null);

		CarePlan superseded = published.supersede();

		assertThat(superseded.status()).isEqualTo(CarePlan.Status.SUPERSEDED);
		assertThat(superseded.id()).isEqualTo(published.id());
		assertThat(superseded.startDate()).isEqualTo(LocalDate.of(2026, 4, 1));
	}

	@Test
	void stoppingAPublishedPlanRecordsTheEffectiveDateReasonAndWho() {
		CarePlan published = new CarePlan(
				5L, 10L, 1L, null, 2, CarePlan.Status.PUBLISHED,
				new BigDecimal("6.50"), LocalDateTime.now(), LocalDateTime.now(), LocalDateTime.now());

		CarePlan stopped = published.stop(LocalDate.of(2026, 9, 22), "Elder moved into a nursing home", 7L);

		assertThat(stopped.status()).isEqualTo(CarePlan.Status.STOPPED);
		assertThat(stopped.stopEffectiveDate()).isEqualTo(LocalDate.of(2026, 9, 22));
		assertThat(stopped.stopReason()).isEqualTo("Elder moved into a nursing home");
		assertThat(stopped.stoppedByUserId()).isEqualTo(7L);
		assertThat(stopped.stoppedAt()).isNotNull();
	}

	@Test
	void stoppingAPlanThatIsNotPublishedIsRejected() {
		CarePlan draft = new CarePlan(
				5L, 10L, 1L, null, 2, CarePlan.Status.DRAFT,
				null, null, LocalDateTime.now(), LocalDateTime.now());

		assertThatThrownBy(() -> draft.stop(LocalDate.of(2026, 9, 22), "reason", 7L))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(ex -> ((BusinessRuleViolation) ex).code())
				.isEqualTo("CARE_PLAN_NOT_PUBLISHED");
	}

	@Test
	void stoppingWithoutAReasonIsRejected() {
		CarePlan published = new CarePlan(
				5L, 10L, 1L, null, 2, CarePlan.Status.PUBLISHED,
				new BigDecimal("6.50"), LocalDateTime.now(), LocalDateTime.now(), LocalDateTime.now());

		assertThatThrownBy(() -> published.stop(LocalDate.of(2026, 9, 22), "  ", 7L))
				.isInstanceOf(BusinessRuleViolation.class)
				.extracting(ex -> ((BusinessRuleViolation) ex).code())
				.isEqualTo("CARE_PLAN_STOP_REASON_REQUIRED");
	}
}
