package sg.nus.carelink.incident.infrastructure.schedule;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import sg.nus.carelink.incident.application.FamilyEmailRecoveryService;

/** Timer for FM05 EMAIL only, independent of SYS03 and incident escalation. @author Wang Zhili */
@Component
class FamilyEmailRecoveryScheduler {
	private final FamilyEmailRecoveryService recovery;
	FamilyEmailRecoveryScheduler(FamilyEmailRecoveryService recovery) { this.recovery = recovery; }
	@Scheduled(fixedDelayString = "${carelink.family-email.scan-interval:PT30S}", initialDelayString = "${carelink.family-email.scan-initial-delay:PT30S}")
	void sweep() { recovery.sweep(); }
}
