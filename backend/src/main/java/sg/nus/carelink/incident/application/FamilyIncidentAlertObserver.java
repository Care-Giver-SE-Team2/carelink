package sg.nus.carelink.incident.application;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import sg.nus.carelink.incident.domain.model.FamilyAlertEvent;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.FamilyAlertDeliveryStore;
import sg.nus.carelink.incident.domain.repository.FamilyAlertDeliveryStore.EventState;
import sg.nus.carelink.incident.domain.repository.IncidentRepository;
import sg.nus.carelink.incident.domain.service.IncidentEventObserver;
import sg.nus.carelink.incident.domain.service.FamilyAlertChannelStrategy;
import sg.nus.carelink.incident.domain.service.FamilyAlertChannelStrategy.Channel;
import sg.nus.carelink.profile.application.FamilyAlertRecipients;
import sg.nus.carelink.shared.error.ResourceNotFound;

/** Family observer; failure of one recipient does not prevent others or roll back the source. @author Wang Zhili */
@Component
class FamilyIncidentAlertObserver implements IncidentEventObserver {
	private static final Logger log = LoggerFactory.getLogger(FamilyIncidentAlertObserver.class);
	private final IncidentRepository incidents;
	private final FamilyAlertRecipients recipients;
	private final FamilyAlertDeliveryStore deliveries;
	private final TransactionTemplate transaction;
	private final Clock clock;
	private final List<FamilyAlertChannelStrategy> channels;

	FamilyIncidentAlertObserver(IncidentRepository incidents, FamilyAlertRecipients recipients, FamilyAlertDeliveryStore deliveries,
			PlatformTransactionManager transactions, Clock clock, List<FamilyAlertChannelStrategy> channels) {
		this.incidents = incidents; this.recipients = recipients; this.deliveries = deliveries; this.clock = clock;
		this.channels = channels.stream().sorted(Comparator.comparing(FamilyAlertChannelStrategy::channel)).toList();
		transaction = new TransactionTemplate(transactions);
		transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
	}

	@Override public void onIncidentEvent(FamilyAlertEvent event) {
		Context context;
		try {
			transaction.executeWithoutResult(status -> deliveries.register(event, now()));
			context = transaction.execute(status -> {
				var incident = incidents.findById(event.incidentId()).orElseThrow(() -> new ResourceNotFound("Incident", event.incidentId()));
				if (!incident.elderId().equals(event.elderId()) || event.type() == FamilyAlertEvent.Type.INCIDENT_UNRESOLVED
						&& incident.status() != Incident.Status.UNRESOLVED_ESCALATED) {
					throw new IllegalArgumentException("Event facts do not match the incident");
				}
				return new Context(incident, recipients.familyMemberIds(event.elderId()));
			});
		} catch (RuntimeException failure) {
			transaction.executeWithoutResult(status -> deliveries.complete(event.eventId(), EventState.FAILED, "EVENT_PROCESSING_FAILED", now()));
			logFailure(event, null, failure);
			return;
		}
		int created = 0;
		boolean failed = false;
		// Complete every mandatory inbox delivery before queuing optional SMTP work.
		for (var channel : channels) {
			var outcome = deliverChannel(event, context, channel);
			created += outcome.created(); failed |= outcome.failed();
		}
		EventState state = failed ? EventState.FAILED : created == 0 ? EventState.NO_RECIPIENTS : EventState.PROCESSED;
		transaction.executeWithoutResult(status -> deliveries.complete(event.eventId(), state,
				state == EventState.FAILED ? "RECIPIENT_PROCESSING_FAILED" : state == EventState.NO_RECIPIENTS ? "NO_ELIGIBLE_FAMILY" : null, now()));
	}

	private Outcome deliverChannel(FamilyAlertEvent event, Context context, FamilyAlertChannelStrategy channel) {
		int created = 0; boolean failed = false;
		boolean mandatory = channel.channel() == Channel.IN_APP;
		for (Long familyId : context.familyIds()) {
			try {
				boolean success = channel.deliver(event, context.incident(), familyId);
				if (mandatory && success) { created++; }
			} catch (RuntimeException failure) {
				if (mandatory) {
					failed = true;
					try { transaction.executeWithoutResult(status -> deliveries.failed(event.eventId(), familyId, now())); }
					catch (RuntimeException recordingFailure) { logFailure(event, familyId, recordingFailure); }
				}
				logFailure(event, familyId, failure);
			}
		}
		return new Outcome(created, failed);
	}
	private record Outcome(int created, boolean failed) { }

	private LocalDateTime now() { return LocalDateTime.now(clock.withZone(Incident.CARELINK_ZONE)); }
	private static void logFailure(FamilyAlertEvent event, Long familyId, RuntimeException failure) {
		log.warn("Family alert failed: eventId={}, familyId={}, errorType={}", event.eventId(), familyId, failure.getClass().getSimpleName());
	}
	private record Context(Incident incident, List<Long> familyIds) { }
}
