package sg.nus.carelink.incident.domain.repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
import sg.nus.carelink.incident.domain.model.FamilyAlertEvent;
import sg.nus.carelink.incident.domain.model.FamilyUrgentNotice;
import sg.nus.carelink.incident.domain.model.FamilyReminderWindow;

/** FM05 outcomes and atomic IN_APP creation; all calls run inside a transaction. @author Wang Zhili */
public interface FamilyAlertDeliveryStore {
	enum EventState { PROCESSED, NO_RECIPIENTS, FAILED }
	void register(FamilyAlertEvent event, LocalDateTime now);
	boolean alreadyCreated(UUID eventId, Long familyId, LocalDateTime now);
	void skipped(UUID eventId, Long familyId, Long accountId, String reason, LocalDateTime now);
	void create(FamilyAlertEvent event, Long familyId, Long accountId, FamilyUrgentNotice notice);
	void failed(UUID eventId, Long familyId, LocalDateTime now);
	void complete(UUID eventId, EventState state, String reason, LocalDateTime now);
	Optional<LocalDateTime> acknowledgeBy(Long incidentId, Long familyId);
	List<FamilyAlertEvent> pendingReminders(LocalDateTime now);
	Optional<LocalDateTime> lockWindow(Long incidentId, Long familyId);
	FamilyReminderWindow lockReminderWindow(Long incidentId, Long familyId);
}
