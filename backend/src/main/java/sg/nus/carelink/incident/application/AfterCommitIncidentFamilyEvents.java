package sg.nus.carelink.incident.application;

import java.time.OffsetDateTime;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import sg.nus.carelink.incident.domain.model.FamilyAlertEvent;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.IncidentEventOutbox;

/** Transaction timing bridge for shared incident routing and its observers. @author Wang Zhili */
@Component
class AfterCommitIncidentFamilyEvents implements IncidentFamilyEvents {
	private static final Logger log = LoggerFactory.getLogger(AfterCommitIncidentFamilyEvents.class);
	private final IncidentEventOutbox outbox;
	private final IncidentEventReplayService replay;
	private final Clock clock;

	AfterCommitIncidentFamilyEvents(IncidentEventOutbox outbox, IncidentEventReplayService replay, Clock clock) {
		this.outbox = outbox; this.replay = replay; this.clock = clock;
	}

	@Override
	public void raised(UUID eventId, Long incidentId, Long elderId, OffsetDateTime occurredAt) {
		register(new FamilyAlertEvent(eventId, FamilyAlertEvent.Type.INCIDENT_RAISED, incidentId, elderId, occurredAt));
	}

	@Override
	public void unresolved(UUID eventId, Long incidentId, Long elderId, OffsetDateTime occurredAt) {
		register(new FamilyAlertEvent(eventId, FamilyAlertEvent.Type.INCIDENT_UNRESOLVED, incidentId, elderId, occurredAt));
	}

	private void register(FamilyAlertEvent event) {
		if (!TransactionSynchronizationManager.isActualTransactionActive()
				|| !TransactionSynchronizationManager.isSynchronizationActive()
				|| TransactionSynchronizationManager.isCurrentTransactionReadOnly()) {
			throw new IllegalStateException("An active write transaction is required to publish an incident event");
		}
		// This write belongs to the incident transaction, not to its after-commit callback.
		outbox.enqueue(event, LocalDateTime.now(clock.withZone(Incident.CARELINK_ZONE)));
		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override public void afterCommit() {
				try { replay.dispatch(event.eventId()); }
				catch (RuntimeException failure) {
					// The scan recovers this persisted trigger; never report a committed source as a failed save.
					log.error("Incident observer failed: eventId={}, incidentId={}, errorType={}",
							event.eventId(), event.incidentId(), failure.getClass().getSimpleName());
				}
			}
		});
	}
}
