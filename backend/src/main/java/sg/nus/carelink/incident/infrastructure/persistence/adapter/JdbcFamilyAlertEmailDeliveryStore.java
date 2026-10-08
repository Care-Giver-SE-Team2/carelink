package sg.nus.carelink.incident.infrastructure.persistence.adapter;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;
import java.time.ZoneOffset;
import sg.nus.carelink.incident.domain.model.FamilyAlertEvent;
import sg.nus.carelink.incident.domain.service.FamilyEmailRetryPolicy;
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
				INSERT INTO family_alert_email_delivery(event_id,family_member_id,attempt_id,status,attempted_at,next_attempt_at)
				VALUES (?, ?, ?, 'QUEUED', ?, ?) ON DUPLICATE KEY UPDATE event_id=event_id
				""", eventId.toString(), familyId, attemptId.toString(), now, FamilyEmailRetryPolicy.nextAttempt(now));
		String owner = jdbc.queryForObject("SELECT attempt_id FROM family_alert_email_delivery WHERE event_id=? AND family_member_id=? FOR UPDATE",
				String.class, eventId.toString(), familyId);
		boolean claimed = attemptId.toString().equals(owner);
		if (claimed) { history(attemptId); }
		return claimed;
	}
	@Override public boolean start(UUID attemptId, LocalDateTime now) {
		boolean started = jdbc.update("UPDATE family_alert_email_delivery SET status='SENDING',attempted_at=?,next_attempt_at=NULL WHERE attempt_id=? AND status='QUEUED'",
				now, attemptId.toString()) == 1;
		if (started) { history(attemptId); }
		return started;
	}
	@Override public void complete(UUID attemptId, Long accountId, State state, String reason, LocalDateTime now) {
		boolean retryable = state == State.FAILED && ("QUEUE_REJECTED".equals(reason) || "SMTP_TEMPORARY_REJECTED".equals(reason));
		jdbc.update("""
				UPDATE family_alert_email_delivery SET recipient_user_id=COALESCE(?,recipient_user_id),status=?,reason=?,attempted_at=?,accepted_at=?,next_attempt_at=?
				WHERE attempt_id=? AND (status='QUEUED' OR (status IN ('SENDING','UNKNOWN') AND ?))
				""", accountId, state.name(), reason, now, state == State.ACCEPTED ? now : null,
				retryable ? FamilyEmailRetryPolicy.nextAttempt(now) : null, attemptId.toString(), !"QUEUE_REJECTED".equals(reason));
		// Queue rejection cannot overwrite an original queued task which has already started SMTP.
		history(attemptId);
	}
	@Override public List<Pending> recoverDue(LocalDateTime now) {
		var rows = jdbc.query("""
				SELECT d.*,e.event_type,e.incident_id,e.elder_id,e.occurred_at FROM family_alert_email_delivery d
				JOIN family_alert_event e ON e.event_id=d.event_id
				WHERE (d.status='QUEUED' AND d.next_attempt_at<=?)
				 OR (d.status='FAILED' AND d.reason IN ('QUEUE_REJECTED','SMTP_TEMPORARY_REJECTED') AND d.attempt_count<? AND d.next_attempt_at<=?)
				 OR (d.status='SENDING' AND d.attempted_at<=?)
				ORDER BY d.attempted_at,d.event_id,d.family_member_id LIMIT 100 FOR UPDATE SKIP LOCKED
				""", (rs, row) -> new Recoverable(new FamilyAlertEvent(UUID.fromString(rs.getString("event_id")),
						FamilyAlertEvent.Type.valueOf(rs.getString("event_type")), rs.getLong("incident_id"), rs.getLong("elder_id"),
						rs.getTimestamp("occurred_at").toLocalDateTime().atOffset(ZoneOffset.ofHours(8))), rs.getLong("family_member_id"),
						UUID.fromString(rs.getString("attempt_id")), State.valueOf(rs.getString("status"))),
				now, FamilyEmailRetryPolicy.MAX_ATTEMPTS, now, FamilyEmailRetryPolicy.staleSendingBefore(now));
		var pending = new ArrayList<Pending>();
		for (var row : rows) {
			if (row.state() == State.SENDING) { complete(row.attemptId(), null, State.UNKNOWN, "STALE_SENDING", now); continue; }
			UUID attempt = row.state() == State.FAILED ? UUID.randomUUID() : row.attemptId();
			// Row locks fence competing scanners; a recovered QUEUED task reuses its SMTP start fence.
			jdbc.update("""
					UPDATE family_alert_email_delivery SET status='QUEUED',reason=NULL,attempt_id=?,attempt_count=attempt_count+?,attempted_at=?,next_attempt_at=?
					WHERE attempt_id=?
					""", attempt.toString(), row.state() == State.FAILED ? 1 : 0, now, FamilyEmailRetryPolicy.nextAttempt(now), row.attemptId().toString());
			history(attempt); pending.add(new Pending(row.event(), row.familyId(), attempt));
		}
		return pending;
	}
	private void history(UUID attemptId) {
		jdbc.update("""
				INSERT INTO family_alert_email_attempt(attempt_id,event_id,family_member_id,attempt_number,recipient_user_id,status,reason,attempted_at,accepted_at)
				SELECT attempt_id,event_id,family_member_id,attempt_count,recipient_user_id,status,reason,attempted_at,accepted_at
				FROM family_alert_email_delivery WHERE attempt_id=?
				ON DUPLICATE KEY UPDATE recipient_user_id=VALUES(recipient_user_id),status=VALUES(status),reason=VALUES(reason),
				 attempted_at=VALUES(attempted_at),accepted_at=VALUES(accepted_at)
				""", attemptId.toString());
	}
	private record Recoverable(FamilyAlertEvent event, Long familyId, UUID attemptId, State state) { }
}
