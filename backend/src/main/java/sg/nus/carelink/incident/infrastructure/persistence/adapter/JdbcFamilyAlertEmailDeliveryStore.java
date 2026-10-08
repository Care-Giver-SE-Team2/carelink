package sg.nus.carelink.incident.infrastructure.persistence.adapter;

import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import sg.nus.carelink.incident.domain.repository.FamilyAlertEmailDeliveryStore;

/** Claim identity avoids MySQL affected-row ambiguity on concurrent duplicate inserts. @author Wang Zhili */
@Repository
@Transactional(propagation = Propagation.MANDATORY)
class JdbcFamilyAlertEmailDeliveryStore implements FamilyAlertEmailDeliveryStore {
	private final JdbcTemplate jdbc;
	JdbcFamilyAlertEmailDeliveryStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }
	@Override public boolean claim(UUID eventId, Long familyId, UUID attemptId, LocalDateTime now) {
		jdbc.update("""
				INSERT INTO family_alert_email_delivery(event_id,family_member_id,attempt_id,status,attempted_at)
				VALUES (?, ?, ?, 'QUEUED', ?) ON DUPLICATE KEY UPDATE event_id=event_id
				""", eventId.toString(), familyId, attemptId.toString(), now);
		String owner = jdbc.queryForObject("SELECT attempt_id FROM family_alert_email_delivery WHERE event_id=? AND family_member_id=? FOR UPDATE",
				String.class, eventId.toString(), familyId);
		return attemptId.toString().equals(owner);
	}
	@Override public boolean start(UUID attemptId, LocalDateTime now) {
		return jdbc.update("UPDATE family_alert_email_delivery SET status='SENDING',attempted_at=? WHERE attempt_id=? AND status='QUEUED'",
				now, attemptId.toString()) == 1;
	}
	@Override public void complete(UUID attemptId, Long accountId, State state, String reason, LocalDateTime now) {
		jdbc.update("""
				UPDATE family_alert_email_delivery SET recipient_user_id=?,status=?,reason=?,attempted_at=?,accepted_at=?
				WHERE attempt_id=? AND status IN ('QUEUED','SENDING')
				""", accountId, state.name(), reason, now, state == State.ACCEPTED ? now : null, attemptId.toString());
	}
}
