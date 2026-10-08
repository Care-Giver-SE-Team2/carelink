package sg.nus.carelink.incident.domain.service;

import java.time.LocalDateTime;

/** Bounded attempts, including queue rejection; ambiguous SMTP results are never retried. @author Wang Zhili */
public final class FamilyEmailRetryPolicy {
	public static final int MAX_ATTEMPTS = 3;
	private FamilyEmailRetryPolicy() { }
	public static LocalDateTime nextAttempt(LocalDateTime now) { return now.plusMinutes(1); }
	public static LocalDateTime staleSendingBefore(LocalDateTime now) { return now.minusMinutes(5); }
}
