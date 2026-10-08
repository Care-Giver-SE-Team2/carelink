package sg.nus.carelink.incident.application;

import java.time.Clock;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.FamilyAlertEmailDeliveryStore;

/** Recover only persisted EMAIL work. Never replay sources, the Subject or mandatory inbox delivery. @author Wang Zhili */
@Service
public class FamilyEmailRecoveryService {
	private static final Logger log = LoggerFactory.getLogger(FamilyEmailRecoveryService.class);
	private final FamilyAlertEmailDeliveryStore deliveries;
	private final EmailFamilyAlertStrategy email;
	private final TransactionTemplate transaction;
	private final Clock clock;
	FamilyEmailRecoveryService(FamilyAlertEmailDeliveryStore deliveries, EmailFamilyAlertStrategy email, PlatformTransactionManager transactions, Clock clock) {
		this.deliveries = deliveries; this.email = email; this.clock = clock;
		transaction = new TransactionTemplate(transactions); transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
	}
	public void sweep() {
		try {
			var pending = transaction.execute(status -> deliveries.recoverDue(LocalDateTime.now(clock.withZone(Incident.CARELINK_ZONE))));
			for (var row : pending) {
				try { email.dispatch(row.event(), row.familyId(), row.attemptId()); }
				catch (RuntimeException failure) {
					log.warn("Family email recovery failed: eventId={}, familyId={}, errorType={}",
							row.event().eventId(), row.familyId(), failure.getClass().getSimpleName());
				}
			}
		} catch (RuntimeException failure) { log.warn("Family email scan failed: errorType={}", failure.getClass().getSimpleName()); }
	}
}
