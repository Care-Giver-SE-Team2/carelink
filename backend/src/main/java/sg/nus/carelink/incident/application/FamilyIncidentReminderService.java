package sg.nus.carelink.incident.application;

import java.time.Clock;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.FamilyAlertDeliveryStore;

/** Publishes overdue personal windows; the observer owns selection and delivery. @author Wang Zhili */
@Service
public class FamilyIncidentReminderService {
	private static final Logger log = LoggerFactory.getLogger(FamilyIncidentReminderService.class);
	private final FamilyAlertDeliveryStore deliveries;
	private final IncidentFamilyEvents events;
	private final TransactionTemplate transaction;
	private final Clock clock;

	public FamilyIncidentReminderService(FamilyAlertDeliveryStore deliveries, IncidentFamilyEvents events,
			PlatformTransactionManager transactions, Clock clock) {
		this.deliveries = deliveries; this.events = events; this.clock = clock;
		transaction = new TransactionTemplate(transactions);
	}

	public void sweep() {
		var pending = transaction.execute(status -> deliveries.pendingReminders(LocalDateTime.now(clock.withZone(Incident.CARELINK_ZONE))));
		for (var event : pending) {
			try {
				transaction.executeWithoutResult(status -> events.acknowledgementDue(event.incidentId(), event.elderId(),
						event.familyMemberId(), event.occurredAt()));
			} catch (RuntimeException failure) {
				// The durable window remains due: a failed scan retries without recording awareness or success.
				log.warn("Family reminder scan failed: incidentId={}, familyId={}, errorType={}",
						event.incidentId(), event.familyMemberId(), failure.getClass().getSimpleName());
			}
		}
	}
}
