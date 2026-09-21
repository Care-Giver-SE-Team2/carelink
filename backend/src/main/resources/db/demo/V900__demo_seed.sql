-- =====================================================================
-- V900  Demonstration seed data
-- =====================================================================
--
-- V1 and V2 create the schema and leave it empty, which means nobody can
-- log in and no screen has anything to show. This adds the smallest set of
-- rows that makes the system demonstrable end to end.
--
-- NOT IN db/migration, and that is the point. Anything under db/migration
-- loads into every database Flyway touches, including the throwaway one a
-- Testcontainers integration test starts - where a test reasonably expects
-- an empty table and clears it itself. Seed rows there turn somebody else's
-- DELETE into a foreign key violation, which is exactly what happened.
--
-- So this file lives in db/demo and only the staging deployment asks for it,
-- through SPRING_FLYWAY_LOCATIONS in deploy/staging/docker-compose.yml.
-- Local development can opt in the same way.
--
-- It is demonstration data, not test fixtures. Every test creates its own
-- rows, so editing this file cannot break the build.
--
-- SECURITY NOTE. These are demonstration accounts for a proof of concept
-- that holds no real personal data. They all share one password,
--
--     Demo#2026
--
-- stored as a bcrypt hash, never in plain text. Before this system could
-- carry a real elder's records these rows would have to go, and account
-- creation would have to move behind the manager's own workflow (UC-MG02).
-- That is recorded as a limitation rather than left implied.
--
-- Three managers, deliberately: UC-MG05's escalation chain can only be
-- demonstrated if there is somebody to escalate to, and then somebody
-- after that.
-- =====================================================================

-- ---------------------------------------------------------------- accounts ---
INSERT INTO app_user (id, username, password_hash, display_name, enabled) VALUES
    (1, 'alice',  '{bcrypt}$2b$10$8hmBV1GponkcfLJprTKf8.glEBN2.HpU3ZGuO7JTvDMZem5qTm9Tm', 'Alice Tan',    TRUE),
    (2, 'ben',    '{bcrypt}$2b$10$8hmBV1GponkcfLJprTKf8.glEBN2.HpU3ZGuO7JTvDMZem5qTm9Tm', 'Ben Lim',      TRUE),
    (3, 'cara',   '{bcrypt}$2b$10$8hmBV1GponkcfLJprTKf8.glEBN2.HpU3ZGuO7JTvDMZem5qTm9Tm', 'Cara Ong',     TRUE),
    (4, 'daniel', '{bcrypt}$2b$10$8hmBV1GponkcfLJprTKf8.glEBN2.HpU3ZGuO7JTvDMZem5qTm9Tm', 'Daniel Goh',   TRUE),
    (5, 'fiona',  '{bcrypt}$2b$10$8hmBV1GponkcfLJprTKf8.glEBN2.HpU3ZGuO7JTvDMZem5qTm9Tm', 'Fiona Rahman', TRUE),
    (6, 'grace',  '{bcrypt}$2b$10$8hmBV1GponkcfLJprTKf8.glEBN2.HpU3ZGuO7JTvDMZem5qTm9Tm', 'Grace Wee',    TRUE);

INSERT INTO user_role (user_id, role) VALUES
    (1, 'MANAGER'),
    (2, 'MANAGER'),
    (3, 'MANAGER'),
    (4, 'CAREGIVER'),
    (5, 'FAMILY'),
    (6, 'ELDER');

-- ------------------------------------------------------------------ elders ---
-- Grace holds the elder account; Mdm Chua has none, which is the ordinary case
-- (an elder gets an account only when someone sets one up for them).
INSERT INTO elder (id, user_id, full_name, gender, date_of_birth, phone, address, postal_code,
                   sector, preferred_dialects, lives_alone, mobility_level, continuity_preference,
                   medical_notes) VALUES
    (1, 6, 'Grace Wee', 'FEMALE', '1944-03-12', '+6591110001',
     'Blk 123 Ang Mo Kio Ave 6, #04-56', '560123', 'AMK', 'Hokkien,Mandarin',
     TRUE, 'ASSISTIVE_CANE', 'PREFERRED',
     'Hypertension. Fell twice in the past year, both times in the bathroom.'),
    (2, NULL, 'Chua Ah Moi', 'FEMALE', '1938-11-02', '+6591110002',
     'Blk 88 Toa Payoh Lor 4, #11-09', '310088', 'TPY', 'Teochew',
     FALSE, 'WHEELCHAIR_BEDBOUND', 'REQUIRED',
     'Post-stroke, limited speech. Daughter is the primary contact.');

-- ------------------------------------------------------- caregiver and family ---
INSERT INTO caregiver (id, user_id, full_name, phone, sector, dialects, status) VALUES
    (1, 4, 'Daniel Goh', '+6591110004', 'AMK', 'Hokkien,Mandarin', 'AVAILABLE');

INSERT INTO family_member (id, user_id, full_name, phone, residential_address) VALUES
    (1, 5, 'Fiona Rahman', '+6591110005', 'Blk 201 Ang Mo Kio Ave 3, #12-34');

INSERT INTO elder_family_binding (id, elder_id, family_member_id, relationship, is_primary_contact,
                                  access_scope, status, confirmed_at) VALUES
    (1, 1, 1, 'DAUGHTER', TRUE, 'FULL', 'ACTIVE', '2026-09-01 09:00:00');

-- ------------------------------------------------------------------ history ---
-- One closed incident, so the escalation chain has a manager who already knows
-- Grace. Without it the continuity tier of the chain has nothing to find and the
-- demonstration only ever shows the fallback.
INSERT INTO incident (id, elder_id, visit_id, reported_by_user_id, responder_user_id, source,
                      category, severity, status, location_text, description,
                      respond_by, reported_at, resolved_at) VALUES
    (1, 1, NULL, 4, 2, 'CAREGIVER', 'FALL', 'MEDIUM', 'RESOLVED',
     'Blk 123 Ang Mo Kio Ave 6, #04-56', 'Slipped getting out of the shower, no injury.',
     NULL, '2026-09-09 10:15:00', '2026-09-09 11:02:00');

INSERT INTO incident_log (incident_id, actor, action, detail, occurred_at) VALUES
    (1, 'caregiver:4', 'REPORTED',  'reported by caregiver', '2026-09-09 10:15:00'),
    (1, 'system',      'ASSIGNED',  'responder=2 :: first responder', '2026-09-09 10:15:00'),
    (1, 'Ben Lim (ben)', 'CLAIMED', 'taken over; countdown stopped', '2026-09-09 10:21:00'),
    (1, 'Ben Lim (ben)', 'CONTACT_ATTEMPTED', 'Reached via PHONE - daughter informed',
     '2026-09-09 10:24:00'),
    (1, 'Ben Lim (ben)', 'RESOLVED',
     'HANDLED_ON_SITE :: No injury. Bathroom grab bar to be fitted this week.',
     '2026-09-09 11:02:00');
