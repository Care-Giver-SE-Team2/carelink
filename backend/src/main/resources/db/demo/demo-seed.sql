-- =====================================================================
-- Demonstration data
-- =====================================================================
--
-- V1 and V2 create the schema and leave it empty, which means nobody can
-- log in and no screen has anything to show. This adds the smallest set of
-- rows that makes the system demonstrable end to end.
--
-- NOT A FLYWAY MIGRATION, and the name says so. It carries no V prefix, so
-- Flyway will not run it even if somebody points spring.flyway.locations at
-- this directory. That is deliberate. While it was a migration, a single
-- failing INSERT stopped the application from starting at all: Flyway runs
-- inside the Spring context, a failed migration is recorded and then fails
-- validation on every subsequent boot, and staging sat in a restart loop
-- until the record was cleared. Demonstration data must never be able to do
-- that. Loading it is an operational act, not a start-up precondition.
--
-- HOW IT IS LOADED
--
--   deploy/staging/load-demo-data.sh  reads it on standard input, so from
--   the repository root on your own machine:
--
--     ssh -i ~/.ssh/care-link.pem ubuntu@HOST \
--         'sudo /opt/carelink/load-demo-data.sh' \
--         < backend/src/main/resources/db/demo/demo-seed.sql
--
--   If it fails, the message appears in that terminal and the running
--   system is untouched. Fix it and run it again.
--
-- SAFE TO RUN AGAIN, AND SAFE ON A DATABASE THAT IS ALREADY IN USE. No row
-- carries an explicit id; every reference is resolved by looking the row up
-- again. Writing ids by hand is what broke staging - the database had been
-- in use for a fortnight and already held id 1. Every statement is written
-- so that a second run inserts nothing and changes nothing.
--
-- It only ever inserts. Nothing here deletes or updates anybody else's data.
--
-- SECURITY NOTE. These are demonstration accounts for a proof of concept
-- that holds no real personal data. They all share one password,
--
--     Demo#2026
--
-- stored as a bcrypt hash, never in plain text. The demo- prefix on every
-- username keeps them apart from accounts real use created, and makes them
-- simple to find and remove. Before this system could carry a real elder's
-- records these rows would have to go, and account creation would have to
-- move behind the manager's own workflow (UC-MG02). That is recorded as a
-- limitation rather than left implied.
--
-- Three managers, deliberately: UC-MG05's escalation chain can only be
-- demonstrated if there is somebody to escalate to, and then somebody
-- after that.
-- =====================================================================

-- ---------------------------------------------------------------- accounts ---
-- username is unique, so IGNORE makes a second run a no-op rather than an error.
INSERT IGNORE INTO app_user (username, password_hash, display_name, enabled) VALUES
    ('demo-alice',  '{bcrypt}$2b$10$8hmBV1GponkcfLJprTKf8.glEBN2.HpU3ZGuO7JTvDMZem5qTm9Tm', 'Alice Tan',    TRUE),
    ('demo-ben',    '{bcrypt}$2b$10$8hmBV1GponkcfLJprTKf8.glEBN2.HpU3ZGuO7JTvDMZem5qTm9Tm', 'Ben Lim',      TRUE),
    ('demo-cara',   '{bcrypt}$2b$10$8hmBV1GponkcfLJprTKf8.glEBN2.HpU3ZGuO7JTvDMZem5qTm9Tm', 'Cara Ong',     TRUE),
    ('demo-daniel', '{bcrypt}$2b$10$8hmBV1GponkcfLJprTKf8.glEBN2.HpU3ZGuO7JTvDMZem5qTm9Tm', 'Daniel Goh',   TRUE),
    ('demo-fiona',  '{bcrypt}$2b$10$8hmBV1GponkcfLJprTKf8.glEBN2.HpU3ZGuO7JTvDMZem5qTm9Tm', 'Fiona Rahman', TRUE),
    ('demo-grace',  '{bcrypt}$2b$10$8hmBV1GponkcfLJprTKf8.glEBN2.HpU3ZGuO7JTvDMZem5qTm9Tm', 'Grace Wee',    TRUE);

-- Whatever ids the database chose, here or on an earlier run. Everything below
-- refers to people through these, never through a number written in this file.
SET @alice  := (SELECT id FROM app_user WHERE username = 'demo-alice');
SET @ben    := (SELECT id FROM app_user WHERE username = 'demo-ben');
SET @cara   := (SELECT id FROM app_user WHERE username = 'demo-cara');
SET @daniel := (SELECT id FROM app_user WHERE username = 'demo-daniel');
SET @fiona  := (SELECT id FROM app_user WHERE username = 'demo-fiona');
SET @grace  := (SELECT id FROM app_user WHERE username = 'demo-grace');

-- (user_id, role) is the primary key, so IGNORE covers the second run.
INSERT IGNORE INTO user_role (user_id, role) VALUES
    (@alice,  'MANAGER'),
    (@ben,    'MANAGER'),
    (@cara,   'MANAGER'),
    (@daniel, 'CAREGIVER'),
    (@fiona,  'FAMILY'),
    (@grace,  'ELDER');

-- ------------------------------------------------------------------ elders ---
-- Grace holds the elder account; Mdm Chua has none, which is the ordinary case
-- (an elder gets an account only when someone sets one up for them).
--
-- elder.user_id is unique, so Grace's row dedupes on it.
INSERT IGNORE INTO elder (user_id, full_name, gender, date_of_birth, phone, address, postal_code,
                          sector, preferred_dialects, lives_alone, mobility_level,
                          continuity_preference, medical_notes) VALUES
    (@grace, 'Grace Wee', 'FEMALE', '1944-03-12', '+6591110001',
     'Blk 123 Ang Mo Kio Ave 6, #04-56', '560123', 'AMK', 'Hokkien,Mandarin',
     TRUE, 'ASSISTIVE_CANE', 'PREFERRED',
     'Hypertension. Fell twice in the past year, both times in the bathroom.');

-- Mdm Chua has no account, so there is no unique key to dedupe on and the
-- second run has to be prevented by asking whether she is there already.
INSERT INTO elder (user_id, full_name, gender, date_of_birth, phone, address, postal_code,
                   sector, preferred_dialects, lives_alone, mobility_level,
                   continuity_preference, medical_notes)
SELECT NULL, 'Chua Ah Moi', 'FEMALE', '1938-11-02', '+6591110002',
       'Blk 88 Toa Payoh Lor 4, #11-09', '310088', 'TPY', 'Teochew',
       FALSE, 'WHEELCHAIR_BEDBOUND', 'REQUIRED',
       'Post-stroke, limited speech. Daughter is the primary contact.'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM elder WHERE full_name = 'Chua Ah Moi' AND user_id IS NULL);

SET @graceElder := (SELECT id FROM elder WHERE user_id = @grace);

-- ------------------------------------------------------- caregiver and family ---
-- Both tables make user_id unique, so both dedupe on it.
INSERT IGNORE INTO caregiver (user_id, full_name, phone, sector, dialects, status) VALUES
    (@daniel, 'Daniel Goh', '+6591110004', 'AMK', 'Hokkien,Mandarin', 'AVAILABLE');

INSERT IGNORE INTO family_member (user_id, full_name, phone, residential_address) VALUES
    (@fiona, 'Fiona Rahman', '+6591110005', 'Blk 201 Ang Mo Kio Ave 3, #12-34');

SET @fionaFamily := (SELECT id FROM family_member WHERE user_id = @fiona);

-- The binding is what UC-MG05 reads when the chain runs out and the family has
-- to be told. (elder_id, family_member_id) is unique.
INSERT IGNORE INTO elder_family_binding (elder_id, family_member_id, relationship,
                                         is_primary_contact, access_scope, status, confirmed_at) VALUES
    (@graceElder, @fionaFamily, 'DAUGHTER', TRUE, 'FULL', 'ACTIVE', '2026-09-01 09:00:00');

-- ------------------------------------------------------------------ history ---
-- One closed incident, so the escalation chain has a manager who already knows
-- Grace. Without it the continuity tier of the chain has nothing to find and the
-- demonstration only ever shows the fallback.
INSERT INTO incident (elder_id, visit_id, reported_by_user_id, responder_user_id, source,
                      category, severity, status, location_text, description,
                      respond_by, reported_at, resolved_at)
SELECT @graceElder, NULL, @daniel, @ben, 'CAREGIVER', 'FALL', 'MEDIUM', 'RESOLVED',
       'Blk 123 Ang Mo Kio Ave 6, #04-56', 'Slipped getting out of the shower, no injury.',
       NULL, '2026-09-09 10:15:00', '2026-09-09 11:02:00'
  FROM DUAL
 WHERE NOT EXISTS (
       SELECT 1 FROM incident
        WHERE elder_id = @graceElder
          AND description = 'Slipped getting out of the shower, no injury.');

SET @incident := (SELECT id FROM incident
                   WHERE elder_id = @graceElder
                     AND description = 'Slipped getting out of the shower, no injury.'
                   ORDER BY id LIMIT 1);

-- The timeline is what the manager's incident screen is for, so the sample
-- incident carries a real one. responder=<id> is the machine-readable form
-- EscalationService reads back, so it is built from the id the database gave
-- Ben rather than written out.
INSERT INTO incident_log (incident_id, actor, action, detail, occurred_at)
SELECT entries.incident_id, entries.actor, entries.action, entries.detail, entries.occurred_at
  FROM (
        SELECT @incident AS incident_id,
               CONCAT('caregiver:', @daniel) AS actor,
               'REPORTED' AS action,
               'reported by caregiver' AS detail,
               '2026-09-09 10:15:00' AS occurred_at
  UNION ALL SELECT @incident, 'system', 'ASSIGNED',
               CONCAT('responder=', @ben, ' :: first responder'), '2026-09-09 10:15:00'
  UNION ALL SELECT @incident, 'Ben Lim (demo-ben)', 'CLAIMED',
               'taken over; countdown stopped', '2026-09-09 10:21:00'
  UNION ALL SELECT @incident, 'Ben Lim (demo-ben)', 'CONTACT_ATTEMPTED',
               'Reached via PHONE - daughter informed', '2026-09-09 10:24:00'
  UNION ALL SELECT @incident, 'Ben Lim (demo-ben)', 'RESOLVED',
               'HANDLED_ON_SITE :: No injury. Bathroom grab bar to be fitted this week.',
               '2026-09-09 11:02:00'
       ) AS entries
 WHERE NOT EXISTS (SELECT 1 FROM incident_log WHERE incident_id = @incident);
