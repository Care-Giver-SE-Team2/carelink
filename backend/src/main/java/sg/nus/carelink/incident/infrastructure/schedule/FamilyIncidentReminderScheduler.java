package sg.nus.carelink.incident.infrastructure.schedule;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import sg.nus.carelink.incident.application.FamilyIncidentReminderService;

/** Timer for FM05 awareness reminders; no notification or manager policy here. @author Wang Zhili */
@Component
class FamilyIncidentReminderScheduler {
	private final FamilyIncidentReminderService reminders;
	FamilyIncidentReminderScheduler(FamilyIncidentReminderService reminders) { this.reminders = reminders; }

	@Scheduled(fixedDelayString = "${carelink.family-alert.reminder-scan-interval:PT60S}",
			initialDelayString = "${carelink.family-alert.reminder-scan-initial-delay:PT30S}")
	void sweep() { reminders.sweep(); }
}
