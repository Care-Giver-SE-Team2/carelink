package sg.nus.carelink.incident.application;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import sg.nus.carelink.incident.domain.model.FamilyAlertEvent;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.FamilyAlertEmailDeliveryStore;
import sg.nus.carelink.incident.domain.repository.FamilyAlertEmailDeliveryStore.State;
import sg.nus.carelink.incident.domain.repository.FamilyNotificationEmailRepository;
import sg.nus.carelink.incident.domain.service.FamilyAlertChannelStrategy;
import sg.nus.carelink.profile.application.FamilyAlertRecipients;

/** Optional channel with a durable claim before asynchronous SMTP. No automatic retry in this batch.
 * An interrupted QUEUED/SENDING attempt needs explicit recovery; replay must never double-send it.
 * @author Wang Zhili
 */
@Component
class EmailFamilyAlertStrategy implements FamilyAlertChannelStrategy {
	private static final Logger log = LoggerFactory.getLogger(EmailFamilyAlertStrategy.class);
	private final FamilyAlertEmailDeliveryStore deliveries;
	private final FamilyNotificationEmailRepository contacts;
	private final FamilyAlertRecipients recipients;
	private final FamilyUrgentEmailSender sender;
	private final Executor executor;
	private final TransactionTemplate transaction;
	private final Clock clock;
	EmailFamilyAlertStrategy(FamilyAlertEmailDeliveryStore deliveries, FamilyNotificationEmailRepository contacts,
			FamilyAlertRecipients recipients, FamilyUrgentEmailSender sender, @Qualifier("familyEmailExecutor") Executor executor,
			PlatformTransactionManager transactions, Clock clock) {
		this.deliveries = deliveries; this.contacts = contacts; this.recipients = recipients;
		this.sender = sender; this.executor = executor; this.clock = clock;
		transaction = new TransactionTemplate(transactions);
		transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
	}
	@Override public Channel channel() { return Channel.EMAIL; }
	@Override public boolean deliver(FamilyAlertEvent event, Incident incident, Long familyId) {
		UUID attempt = UUID.randomUUID();
		boolean queued = transaction.execute(status -> {
			if (!deliveries.claim(event.eventId(), familyId, attempt, now())) { return false; }
			var candidate = recipients.resolve(event.elderId(), familyId);
			String reason = !candidate.eligible() ? candidate.exclusionReason() : !sender.configured() ? "EMAIL_UNAVAILABLE"
					: contacts.find(familyId).verifiedAt() == null ? "UNVERIFIED_EMAIL" : null;
			if (reason != null) { deliveries.complete(attempt, candidate.userId(), State.SKIPPED, reason, now()); return false; }
			return true;
		});
		if (!queued) { return false; }
		try { executor.execute(() -> send(event, familyId, attempt)); }
		catch (RejectedExecutionException _) {
			transaction.executeWithoutResult(status -> deliveries.complete(attempt, null, State.FAILED, "QUEUE_REJECTED", now()));
			return false;
		}
		return true;
	}
	private void send(FamilyAlertEvent event, Long familyId, UUID attempt) {
		try {
			// Commit SENDING first: a crash or lost SMTP response must not turn replay into another send.
			if (!transaction.execute(status -> deliveries.start(attempt, now()))) { return; }
			transaction.executeWithoutResult(status -> {
				// Serialize with address change/removal and recheck current authorization after obtaining the contact lock.
				var contact = contacts.lock(familyId);
				var candidate = recipients.resolve(event.elderId(), familyId);
				String reason = !candidate.eligible() ? candidate.exclusionReason() : !sender.configured() ? "EMAIL_UNAVAILABLE"
						: contact.verifiedAt() == null ? "UNVERIFIED_EMAIL" : null;
				if (reason != null) { deliveries.complete(attempt, candidate.userId(), State.SKIPPED, reason, now()); return; }
				sender.send(contact.email(), event);
				deliveries.complete(attempt, candidate.userId(), State.ACCEPTED, null, now());
			});
		} catch (RuntimeException failure) {
			// SMTP and MySQL are not atomic. Neither a timeout nor a result-write failure proves non-delivery.
			try { transaction.executeWithoutResult(status -> deliveries.complete(attempt, null, State.UNKNOWN, "DISPATCH_NOT_CONFIRMED", now())); }
			catch (RuntimeException recordingFailure) { logFailure(event, familyId, recordingFailure); }
			logFailure(event, familyId, failure);
		}
	}
	private LocalDateTime now() { return LocalDateTime.now(clock.withZone(Incident.CARELINK_ZONE)); }
	private void logFailure(FamilyAlertEvent event, Long familyId, RuntimeException failure) {
		log.warn("Family email failed: eventId={}, familyId={}, errorType={}", event.eventId(), familyId, failure.getClass().getSimpleName());
	}
}
