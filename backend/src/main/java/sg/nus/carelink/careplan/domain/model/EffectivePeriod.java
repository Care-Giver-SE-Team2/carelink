package sg.nus.carelink.careplan.domain.model;

import java.time.LocalDate;
import java.util.Objects;

/**
 * The days a plan version's weekly schedule is in force: from {@code from}, up to but not
 * including {@code until}. A null {@code until} means open-ended (the elder's current plan).
 * An empty period ({@code until} on or before {@code from}) is a version that was replaced or
 * stopped before it ever started, and schedules nothing.
 */
public record EffectivePeriod(LocalDate from, LocalDate until) {

	public EffectivePeriod {
		Objects.requireNonNull(from, "from");
	}

	public boolean isEmpty() {
		return until != null && !until.isAfter(from);
	}

	/**
	 * This period, ended no later than {@code date} (null leaves it as it is). A later version
	 * may start before the one it replaced did; every older version must then end there too, or
	 * two versions would schedule the same days.
	 */
	public EffectivePeriod endingBy(LocalDate date) {
		return date == null || (until != null && !date.isBefore(until)) ? this : new EffectivePeriod(from, date);
	}
}
