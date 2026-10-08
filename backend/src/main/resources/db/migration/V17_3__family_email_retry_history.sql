-- Preserve each EMAIL attempt; never alter IN_APP keys, notifications or acknowledgement windows.
ALTER TABLE family_alert_email_delivery
    ADD COLUMN attempt_count INT NOT NULL DEFAULT 1,
    ADD COLUMN next_attempt_at DATETIME(6) NULL,
    ADD KEY ix_family_email_due (status, next_attempt_at),
    ADD KEY ix_family_email_stale (status, attempted_at);
UPDATE family_alert_email_delivery SET next_attempt_at=DATE_ADD(attempted_at, INTERVAL 1 MINUTE)
    WHERE status='QUEUED' OR (status='FAILED' AND reason='QUEUE_REJECTED');
CREATE TABLE family_alert_email_attempt (
    attempt_id CHAR(36) NOT NULL PRIMARY KEY,
    event_id CHAR(36) NOT NULL,
    family_member_id BIGINT NOT NULL,
    attempt_number INT NOT NULL,
    recipient_user_id BIGINT NULL,
    status VARCHAR(16) NOT NULL,
    reason VARCHAR(64) NULL,
    attempted_at DATETIME(6) NOT NULL,
    accepted_at DATETIME(6) NULL,
    UNIQUE KEY uq_family_email_attempt_number (event_id, family_member_id, attempt_number),
    CONSTRAINT ck_family_email_attempt_status CHECK (status IN ('QUEUED','SENDING','ACCEPTED','SKIPPED','FAILED','UNKNOWN'))
);
INSERT INTO family_alert_email_attempt(attempt_id,event_id,family_member_id,attempt_number,recipient_user_id,status,reason,attempted_at,accepted_at)
    SELECT attempt_id,event_id,family_member_id,attempt_count,recipient_user_id,status,reason,attempted_at,accepted_at
    FROM family_alert_email_delivery;
