-- FM05 EMAIL outcomes are independent of mandatory inbox deduplication and awareness.
-- Soft references retain failure facts even if a recipient becomes ineligible.
CREATE TABLE family_alert_email_delivery (
    event_id CHAR(36) NOT NULL,
    family_member_id BIGINT NOT NULL,
    attempt_id CHAR(36) NOT NULL,
    recipient_user_id BIGINT NULL,
    status VARCHAR(16) NOT NULL,
    reason VARCHAR(64) NULL,
    attempted_at DATETIME(6) NOT NULL,
    accepted_at DATETIME(6) NULL,
    PRIMARY KEY (event_id, family_member_id),
    UNIQUE KEY uq_family_email_attempt (attempt_id),
    CONSTRAINT ck_family_email_status CHECK (status IN ('QUEUED','SENDING','ACCEPTED','SKIPPED','FAILED','UNKNOWN'))
);
