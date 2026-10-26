package sg.nus.carelink.rostering.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.rostering.domain.model.RecurringSchedule;
import sg.nus.carelink.rostering.domain.model.RecurringSchedule.RecurringTask;
import sg.nus.carelink.rostering.domain.model.RecurringSchedule.VisitSlot;
import sg.nus.carelink.rostering.domain.model.RecurringSchedule.WeeklySlot;

class RecurringScheduleTest {

	// Thursday 1 Oct 2026.
	private static final LocalDate THU_1 = LocalDate.of(2026, 10, 1);
	private static final LocalTime EIGHT = LocalTime.of(8, 0);
	private static final LocalTime FOUR_THIRTY = LocalTime.of(16, 30);

	private final RecurringTask bathing = new RecurringTask(30L, "Personal care", "BATHING", "Bathing assistance", List.of(
			new WeeklySlot(DayOfWeek.MONDAY, EIGHT, 30), new WeeklySlot(DayOfWeek.THURSDAY, FOUR_THIRTY, 45)));

	@Test
	void datesEachWeeklySlotInTheWindowEarliestFirst() {
		RecurringSchedule plan = new RecurringSchedule(9L, 42L, THU_1, null, List.of(bathing));

		assertThat(plan.visitsBetween(THU_1.atStartOfDay(), THU_1.plusDays(8))).containsExactly(
				slot(THU_1.atTime(FOUR_THIRTY), 45),
				slot(LocalDate.of(2026, 10, 5).atTime(EIGHT), 30),
				slot(LocalDate.of(2026, 10, 8).atTime(FOUR_THIRTY), 45));
	}

	@Test
	void keepsTodaysVisitStillRunningButSkipsOneThatHasEnded() {
		RecurringSchedule plan = new RecurringSchedule(9L, 42L, THU_1, null, List.of(bathing));

		assertThat(plan.visitsBetween(THU_1.atTime(17, 0), THU_1.plusDays(1))).containsExactly(slot(THU_1.atTime(FOUR_THIRTY), 45));
		assertThat(plan.visitsBetween(THU_1.atTime(17, 15), THU_1.plusDays(1))).isEmpty();
	}

	@Test
	void staysInsideTheDaysThePlanIsInForce() {
		RecurringSchedule plan = new RecurringSchedule(9L, 42L, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 8),
				List.of(bathing));

		assertThat(plan.visitsBetween(THU_1.atStartOfDay(), THU_1.plusDays(14)))
				.extracting(VisitSlot::start)
				.containsExactly(LocalDate.of(2026, 10, 5).atTime(EIGHT));
	}

	@Test
	void anOpenEndedPlanCallsNothingOff() {
		RecurringSchedule plan = new RecurringSchedule(9L, 42L, THU_1, null, List.of(bathing));

		assertThat(plan.callOffFrom(THU_1.atTime(9, 0))).isEmpty();
	}

	@Test
	void anEndedPlanCallsOffFromItsEndButNeverFromThePast() {
		LocalDateTime now = THU_1.atTime(9, 0);
		RecurringSchedule endsNextWeek = new RecurringSchedule(9L, 42L, THU_1, LocalDate.of(2026, 10, 8), List.of());
		RecurringSchedule endedYesterday = new RecurringSchedule(9L, 42L, THU_1.minusDays(9), THU_1.minusDays(1), List.of());

		assertThat(endsNextWeek.callOffFrom(now)).contains(LocalDate.of(2026, 10, 8).atStartOfDay());
		assertThat(endedYesterday.callOffFrom(now)).contains(now);
	}

	@Test
	void shortensATaskNameThatWouldNotFitAVisitsServiceType() {
		RecurringTask longName = new RecurringTask(30L, null, null, "x".repeat(80), List.of());

		assertThat(longName.serviceType()).hasSize(50).endsWith("…");
	}

	@Test
	void carriesOverTheSlotsTheSuccessorKeepsUnchanged() {
		LocalDate monday = LocalDate.of(2026, 10, 5);
		RecurringSchedule replaced = new RecurringSchedule(8L, 42L, THU_1.minusDays(30), monday, List.of(bathing));
		RecurringTask movedThursday = new RecurringTask(40L, "Personal care", "BATHING", "Bathing assistance", List.of(
				new WeeklySlot(DayOfWeek.MONDAY, EIGHT, 30), new WeeklySlot(DayOfWeek.THURSDAY, FOUR_THIRTY.plusHours(1), 45)));
		RecurringTask renamed = new RecurringTask(41L, "Personal care", "BATHING", "Shower", List.of(
				new WeeklySlot(DayOfWeek.MONDAY, EIGHT, 30)));
		RecurringSchedule successor = new RecurringSchedule(9L, 42L, monday, null, List.of(movedThursday, renamed));

		assertThat(replaced.carriedInto(successor, THU_1.atTime(9, 0), THU_1.plusDays(14)))
				.extracting(RecurringSchedule.CarriedSlot::fromCarePlanId, RecurringSchedule.CarriedSlot::fromCarePlanNodeId,
						carried -> carried.to().carePlanNodeId(), carried -> carried.to().start())
				.containsExactly(
						org.assertj.core.groups.Tuple.tuple(8L, 30L, 40L, monday.atTime(EIGHT)),
						org.assertj.core.groups.Tuple.tuple(8L, 30L, 40L, monday.plusDays(7).atTime(EIGHT)));
	}

	@Test
	void carriesNothingIntoAVersionThatDidNotTakeOverWhenItEnded() {
		RecurringSchedule stopped = new RecurringSchedule(8L, 42L, THU_1.minusDays(30), THU_1, List.of(bathing));
		RecurringSchedule later = new RecurringSchedule(9L, 42L, THU_1.plusDays(4), null, List.of(bathing));

		assertThat(stopped.carriedInto(later, THU_1.atTime(9, 0), THU_1.plusDays(14))).isEmpty();
	}

	private static VisitSlot slot(LocalDateTime start, int minutes) {
		return new VisitSlot(9L, 30L, 42L, "Bathing assistance", start, start.plusMinutes(minutes));
	}
}
