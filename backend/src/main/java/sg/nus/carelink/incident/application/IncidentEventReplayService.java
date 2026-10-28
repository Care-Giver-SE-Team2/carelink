package sg.nus.carelink.incident.application;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.IncidentEventOutbox;
import sg.nus.carelink.incident.domain.service.IncidentEventObserver;
import sg.nus.carelink.incident.domain.service.IncidentEventSubject;

/** At-least-once dispatch: recovery reuses event IDs and the observer's persistent recipient keys. @author Wang Zhili */
@Service
public class IncidentEventReplayService {
	private static final Logger log = LoggerFactory.getLogger(IncidentEventReplayService.class);
	private final IncidentEventOutbox outbox;
	private final IncidentEventSubject subject;
	private final TransactionTemplate transaction;
	private final Clock clock;
	private final Duration lease;
	private final Duration retryDelay;

	IncidentEventReplayService(IncidentEventOutbox outbox, List<IncidentEventObserver> observers,
			PlatformTransactionManager transactions, Clock clock,
			@Value("${carelink.family-alert.outbox.lease:PT2M}") Duration lease,
			@Value("${carelink.family-alert.outbox.retry-delay:PT30S}") Duration retryDelay) {
		if (lease.isZero() || lease.isNegative() || retryDelay.isZero() || retryDelay.isNegative()) {
			throw new IllegalArgumentException("Outbox lease and retry delay must be positive");
		}
		this.outbox = outbox; this.subject = new IncidentEventSubject(observers); this.clock = clock;
		this.lease = lease; this.retryDelay = retryDelay;
		transaction = new TransactionTemplate(transactions);
		transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
	}

	/** Claims commit before dispatch; a crash anywhere afterwards leaves an expiring durable lease. */
	public void dispatch(UUID id) {
		UUID token = UUID.randomUUID();
		var event = transaction.execute(status -> outbox.claim(id, token, now(), now().plus(lease)));
		if (event.isEmpty()) { return; }
		var failures = subject.notifyObservers(event.get());
		for (var failure : failures) {
			log.warn("Incident observer failed: eventId={}, errorType={}", id, failure.getClass().getSimpleName());
		}
		transaction.executeWithoutResult(status -> outbox.finish(id, token, failures.isEmpty(), now().plus(retryDelay)));
	}

	public void sweep() {
		try {
			var due = transaction.execute(status -> outbox.due(now(), 50));
			for (UUID id : due) {
				try { dispatch(id); }
				catch (RuntimeException failure) { log.warn("Incident replay failed: eventId={}, errorType={}", id, failure.getClass().getSimpleName()); }
			}
		} catch (RuntimeException failure) {
			log.warn("Incident replay scan failed: errorType={}", failure.getClass().getSimpleName());
		}
	}

	private LocalDateTime now() { return LocalDateTime.now(clock.withZone(Incident.CARELINK_ZONE)); }
}
