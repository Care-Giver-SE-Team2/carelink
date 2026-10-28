package sg.nus.carelink.incident.infrastructure.notify;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import sg.nus.carelink.incident.domain.model.FamilyAlertEvent;
import sg.nus.carelink.incident.domain.repository.IncidentEventOutbox;

/** SQL claims are atomic across application instances; every operation joins its caller's transaction. @author Wang Zhili */
@Repository
@Transactional(propagation = Propagation.MANDATORY)
class JdbcIncidentEventOutbox implements IncidentEventOutbox {
	private final JdbcTemplate jdbc;
	JdbcIncidentEventOutbox(JdbcTemplate jdbc) { this.jdbc = jdbc; }

	@Override public void enqueue(FamilyAlertEvent event, LocalDateTime now) {
		jdbc.update("""
				INSERT INTO incident_event_outbox (event_id, event_type, incident_id, elder_id, occurred_at, state, available_at)
				VALUES (?, ?, ?, ?, ?, 'PENDING', ?) ON DUPLICATE KEY UPDATE event_id = event_id
				""", event.eventId().toString(), event.type().name(), event.incidentId(), event.elderId(),
				Timestamp.valueOf(event.occurredAt().toLocalDateTime()), Timestamp.valueOf(now));
		FamilyAlertEvent saved = jdbc.queryForObject("SELECT * FROM incident_event_outbox WHERE event_id=? FOR UPDATE",
				(rs, row) -> event(rs), event.eventId().toString());
		if (!event.equals(saved)) { throw new IllegalArgumentException("An eventId cannot be reused for different facts"); }
		// Explicit producer replay may re-evaluate previously skipped recipients; successful pairs stay deduplicated.
		jdbc.update("UPDATE incident_event_outbox SET state='PENDING', available_at=? WHERE event_id=? AND state='DELIVERED'",
				Timestamp.valueOf(now), event.eventId().toString());
	}

	@Override public List<UUID> due(LocalDateTime now, int limit) {
		return jdbc.query("""
				SELECT event_id FROM incident_event_outbox
				WHERE state IN ('PENDING', 'PROCESSING') AND available_at <= ?
				ORDER BY available_at, event_id LIMIT ?
				""", (rs, row) -> UUID.fromString(rs.getString("event_id")), Timestamp.valueOf(now), limit);
	}

	@Override public Optional<FamilyAlertEvent> claim(UUID eventId, UUID token, LocalDateTime now, LocalDateTime leaseUntil) {
		int claimed = jdbc.update("""
				UPDATE incident_event_outbox SET state='PROCESSING', lease_token=?, available_at=?
				WHERE event_id=? AND state IN ('PENDING', 'PROCESSING') AND available_at <= ?
				""", token.toString(), Timestamp.valueOf(leaseUntil), eventId.toString(), Timestamp.valueOf(now));
		return claimed == 0 ? Optional.empty() : Optional.ofNullable(jdbc.queryForObject(
				"SELECT * FROM incident_event_outbox WHERE event_id=?", (rs, row) -> event(rs), eventId.toString()));
	}

	@Override public void finish(UUID eventId, UUID token, boolean delivered, LocalDateTime nextAttempt) {
		// A worker that outlived its lease cannot overwrite the newer worker's result.
		jdbc.update("""
				UPDATE incident_event_outbox SET state=?, available_at=?, lease_token=NULL
				WHERE event_id=? AND lease_token=? AND state='PROCESSING'
				""", delivered ? "DELIVERED" : "PENDING", Timestamp.valueOf(nextAttempt), eventId.toString(), token.toString());
	}

	private static FamilyAlertEvent event(ResultSet rs) throws SQLException {
		return new FamilyAlertEvent(UUID.fromString(rs.getString("event_id")), FamilyAlertEvent.Type.valueOf(rs.getString("event_type")),
				rs.getLong("incident_id"), rs.getLong("elder_id"), rs.getTimestamp("occurred_at").toLocalDateTime().atOffset(ZoneOffset.ofHours(8)));
	}
}
