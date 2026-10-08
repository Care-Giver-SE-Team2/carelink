package sg.nus.carelink.incident.domain.repository;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import sg.nus.carelink.incident.domain.model.FamilyAlertEvent;

/** Separate EMAIL key; only due queued work or proven temporary failures can recover. @author Wang Zhili */
public interface FamilyAlertEmailDeliveryStore {
	enum State { QUEUED, SENDING, ACCEPTED, SKIPPED, FAILED, UNKNOWN }
	boolean claim(UUID eventId, Long familyId, UUID attemptId, LocalDateTime now);
	boolean start(UUID attemptId, LocalDateTime now);
	void complete(UUID attemptId, Long accountId, State state, String reason, LocalDateTime now);
	List<Pending> recoverDue(LocalDateTime now);
	record Pending(FamilyAlertEvent event, Long familyId, UUID attemptId) { }
}
