package sg.nus.carelink.incident.application;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import sg.nus.carelink.incident.domain.model.FamilyAlertEvent;
import sg.nus.carelink.incident.domain.model.FamilyUrgentNotice;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.FamilyAlertDeliveryStore;
import sg.nus.carelink.incident.domain.service.FamilyAlertChannelStrategy;
import sg.nus.carelink.profile.application.FamilyAlertRecipients;

/** Keeps the existing mandatory inbox key, response window and recipient transaction. @author Wang Zhili */
@Component
class InAppFamilyAlertStrategy implements FamilyAlertChannelStrategy {
	private final FamilyAlertRecipients recipients;
	private final FamilyAlertDeliveryStore deliveries;
	private final TransactionTemplate transaction;
	private final Clock clock;
	private final Duration window;
	InAppFamilyAlertStrategy(FamilyAlertRecipients recipients, FamilyAlertDeliveryStore deliveries,
			PlatformTransactionManager transactions, Clock clock, @Value("${carelink.family-alert.response-window:PT2H}") Duration window) {
		if (window.isZero() || window.isNegative()) { throw new IllegalArgumentException("The family response window must be positive"); }
		this.recipients = recipients; this.deliveries = deliveries; this.clock = clock; this.window = window;
		transaction = new TransactionTemplate(transactions);
		transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
	}
	@Override public Channel channel() { return Channel.IN_APP; }
	@Override public boolean deliver(FamilyAlertEvent event, Incident incident, Long familyId) {
		return transaction.execute(status -> {
			var now = LocalDateTime.now(clock.withZone(Incident.CARELINK_ZONE));
			if (deliveries.alreadyCreated(event.eventId(), familyId, now)) { return true; }
			var candidate = recipients.resolve(event.elderId(), familyId);
			if (!candidate.eligible()) {
				deliveries.skipped(event.eventId(), familyId, candidate.userId(), candidate.exclusionReason(), now);
				return false;
			}
			deliveries.create(event, familyId, candidate.userId(), FamilyUrgentNotice.forIncident(event, incident, now, window));
			return true;
		});
	}
}
