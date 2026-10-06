package sg.nus.carelink.rostering.application;

import java.time.Duration;
import java.util.Objects;

/** How far back a caregiver's finished visits to an elder count as knowing them (UC-MG04). */
public record ContinuityLookback(Duration period) {

	public static final ContinuityLookback DEFAULT = new ContinuityLookback(Duration.ofDays(180));

	public ContinuityLookback {
		Objects.requireNonNull(period, "period");
	}
}
