package sg.nus.carelink.incident.infrastructure.schedule;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import sg.nus.carelink.incident.application.IncidentEventReplayService;

/** Recovery trigger only; the application service owns claims and dispatch. @author Wang Zhili */
@Component
class IncidentEventReplayScheduler {
	private final IncidentEventReplayService replay;
	IncidentEventReplayScheduler(IncidentEventReplayService replay) { this.replay = replay; }

	@Scheduled(fixedDelayString = "${carelink.family-alert.outbox.scan-interval:PT15S}",
			initialDelayString = "${carelink.family-alert.outbox.scan-initial-delay:PT15S}")
	void sweep() { replay.sweep(); }
}
