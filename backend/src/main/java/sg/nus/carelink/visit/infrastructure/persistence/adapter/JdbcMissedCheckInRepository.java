package sg.nus.carelink.visit.infrastructure.persistence.adapter;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import sg.nus.carelink.visit.domain.model.MissedCheckInTrigger;
import sg.nus.carelink.visit.domain.repository.MissedCheckInRepository;

@Repository
class JdbcMissedCheckInRepository implements MissedCheckInRepository {
    private final JdbcTemplate jdbc;
    JdbcMissedCheckInRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Override public List<Candidate> candidates(LocalDateTime since, LocalDateTime before, Candidate after, int limit) {
        String query = """
                SELECT v.id, v.scheduled_start FROM visit v
                WHERE v.status='SCHEDULED' AND v.caregiver_id IS NOT NULL AND v.checked_in_at IS NULL
                AND v.scheduled_start >= ? AND v.scheduled_start < ?
                AND NOT EXISTS (SELECT 1 FROM visit_missed_check_in_trigger t WHERE t.visit_id=v.id)
                """;
        var parameters = new java.util.ArrayList<Object>(List.of(since, before));
        if (after != null) {
            query += " AND (v.scheduled_start > ? OR (v.scheduled_start = ? AND v.id > ?))";
            parameters.add(after.scheduledStart()); parameters.add(after.scheduledStart()); parameters.add(after.visitId());
        }
        parameters.add(limit);
        return jdbc.query(query + " ORDER BY v.scheduled_start, v.id LIMIT ?",
                (row, _) -> new Candidate(row.getLong("id"), row.getTimestamp("scheduled_start").toLocalDateTime()), parameters.toArray());
    }
    @Override public boolean exists(Long visitId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM visit_missed_check_in_trigger WHERE visit_id=?)", Boolean.class, visitId));
    }
    @Override public void save(MissedCheckInTrigger t) {
        jdbc.update("""
                INSERT INTO visit_missed_check_in_trigger(visit_id,incident_id,triggered_caregiver_id,
                scheduled_start,check_in_due_at,observed_visit_version,triggered_at) VALUES (?,?,?,?,?,?,?)
                """, t.visitId(), t.incidentId(), t.caregiverId(), t.scheduledStart(), t.dueAt(), t.observedVersion(), t.triggeredAt());
    }
}
