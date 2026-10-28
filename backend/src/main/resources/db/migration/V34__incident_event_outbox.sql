-- The source incident and its notification trigger must commit or roll back together.
-- No care description or family data is copied into the outbox.
CREATE TABLE incident_event_outbox (
    event_id CHAR(36) NOT NULL PRIMARY KEY,
    event_type VARCHAR(40) NOT NULL,
    incident_id BIGINT NOT NULL,
    elder_id BIGINT NOT NULL,
    occurred_at DATETIME(6) NOT NULL,
    state VARCHAR(24) NOT NULL,
    available_at DATETIME(6) NOT NULL,
    lease_token CHAR(36) NULL,
    INDEX ix_incident_outbox_due (state, available_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
