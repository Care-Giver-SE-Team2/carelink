package sg.nus.carelink.incident.domain.model;

import java.time.LocalDateTime;

/** Reading a notice does not end waiting; only awareness or resolution does. @author Wang Zhili */
public record FamilyReminderWindow(LocalDateTime acknowledgeBy, LocalDateTime acknowledgedAt, boolean resolved) {
	public boolean isDueAt(LocalDateTime now) {
		return acknowledgeBy != null && !acknowledgeBy.isAfter(now) && acknowledgedAt == null && !resolved;
	}
}
