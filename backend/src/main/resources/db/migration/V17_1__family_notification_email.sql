-- FM05 owns this notification contact, independently of account/profile data.
CREATE TABLE family_notification_email (
    family_member_id BIGINT NOT NULL PRIMARY KEY,
    email VARCHAR(254),
    verified_at DATETIME(6),
    token_hash CHAR(64),
    verification_expires_at DATETIME(6),
    requested_at DATETIME(6),
    CONSTRAINT fk_family_notification_email_family FOREIGN KEY (family_member_id) REFERENCES family_member(id)
);
