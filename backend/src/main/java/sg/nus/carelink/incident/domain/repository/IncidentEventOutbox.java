package sg.nus.carelink.incident.domain.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import sg.nus.carelink.incident.domain.model.FamilyAlertEvent;

/** Durable source facts; lease tokens fence late workers without changing event identity. @author Wang Zhili */
public interface IncidentEventOutbox {
	void enqueue(FamilyAlertEvent event, LocalDateTime now);
	List<UUID> due(LocalDateTime now, int limit);
	Optional<FamilyAlertEvent> claim(UUID eventId, UUID token, LocalDateTime now, LocalDateTime leaseUntil);
	void finish(UUID eventId, UUID token, boolean delivered, LocalDateTime nextAttempt);
}
