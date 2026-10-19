-- FM05: source events broadcast; an awareness reminder targets one existing personal window.
ALTER TABLE family_alert_event ADD COLUMN family_member_id BIGINT NULL;
CREATE INDEX idx_family_reminder_event ON family_alert_event (incident_id, family_member_id, event_type);
CREATE INDEX idx_family_alert_deadline ON family_alert_window (acknowledge_by);
