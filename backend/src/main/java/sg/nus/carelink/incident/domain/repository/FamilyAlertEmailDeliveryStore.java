package sg.nus.carelink.incident.domain.repository;

import java.time.LocalDateTime;
import java.util.UUID;

/** Separate EMAIL key; replay never retries an uncertain or previously skipped send. @author Wang Zhili */
public interface FamilyAlertEmailDeliveryStore {
	enum State { QUEUED, SENDING, ACCEPTED, SKIPPED, FAILED, UNKNOWN }
	boolean claim(UUID eventId, Long familyId, UUID attemptId, LocalDateTime now);
	boolean start(UUID attemptId, LocalDateTime now);
	void complete(UUID attemptId, Long accountId, State state, String reason, LocalDateTime now);
}
