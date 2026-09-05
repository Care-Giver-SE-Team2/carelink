-- =====================================================================
-- CareLink — Supervisor module, consolidated schema (12 tables)
-- Matches the "How it all comes together" summary ERD.
-- Target: MySQL 8.4 LTS
-- Usage: run in Navicat Premium Lite's Query Editor (or any MySQL client)
--        against an empty schema.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Actors
-- ---------------------------------------------------------------------
CREATE TABLE supervisor (
    supervisor_id   INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(150) UNIQUE
) ENGINE=InnoDB;

CREATE TABLE elder (
    elder_id        INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    sector          VARCHAR(50)
) ENGINE=InnoDB;

CREATE TABLE caregiver (
    caregiver_id    INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    sector          VARCHAR(50)
) ENGINE=InnoDB;

CREATE TABLE family_member (
    family_member_id   INT AUTO_INCREMENT PRIMARY KEY,
    elder_id            INT NOT NULL,
    name                VARCHAR(150) NOT NULL,
    CONSTRAINT fk_familymember_elder
        FOREIGN KEY (elder_id) REFERENCES elder(elder_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Care plan
-- ---------------------------------------------------------------------
CREATE TABLE care_plan (
    care_plan_id    INT AUTO_INCREMENT PRIMARY KEY,
    elder_id        INT NOT NULL,
    supervisor_id   INT NOT NULL,
    version         VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    status          VARCHAR(20) NOT NULL DEFAULT 'Draft',
    total_hours     DECIMAL(6,2),
    CONSTRAINT fk_careplan_elder
        FOREIGN KEY (elder_id) REFERENCES elder(elder_id),
    CONSTRAINT fk_careplan_supervisor
        FOREIGN KEY (supervisor_id) REFERENCES supervisor(supervisor_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Absence & Visit  (created before visit since visit references it)
-- ---------------------------------------------------------------------
CREATE TABLE absence_report (
    absence_id      INT AUTO_INCREMENT PRIMARY KEY,
    caregiver_id    INT NOT NULL,
    supervisor_id   INT NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Pending',
    CONSTRAINT fk_absence_caregiver
        FOREIGN KEY (caregiver_id) REFERENCES caregiver(caregiver_id),
    CONSTRAINT fk_absence_supervisor
        FOREIGN KEY (supervisor_id) REFERENCES supervisor(supervisor_id)
) ENGINE=InnoDB;

CREATE TABLE visit (
    visit_id            INT AUTO_INCREMENT PRIMARY KEY,
    elder_id            INT NOT NULL,
    caregiver_id        INT,
    supervisor_id       INT NOT NULL,
    absence_id          INT,
    scheduled_time       TIME NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
    CONSTRAINT fk_visit_elder
        FOREIGN KEY (elder_id) REFERENCES elder(elder_id),
    CONSTRAINT fk_visit_caregiver
        FOREIGN KEY (caregiver_id) REFERENCES caregiver(caregiver_id),
    CONSTRAINT fk_visit_supervisor
        FOREIGN KEY (supervisor_id) REFERENCES supervisor(supervisor_id),
    CONSTRAINT fk_visit_absence
        FOREIGN KEY (absence_id) REFERENCES absence_report(absence_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Incident & Incident Log
-- ---------------------------------------------------------------------
CREATE TABLE incident (
    incident_id                INT AUTO_INCREMENT PRIMARY KEY,
    elder_id                   INT NOT NULL,
    caregiver_id                INT,
    responder_supervisor_id     INT,
    severity                    VARCHAR(20) NOT NULL,
    status                      VARCHAR(30) NOT NULL DEFAULT 'Open',
    reported_time               DATETIME NOT NULL,
    CONSTRAINT fk_incident_elder
        FOREIGN KEY (elder_id) REFERENCES elder(elder_id),
    CONSTRAINT fk_incident_caregiver
        FOREIGN KEY (caregiver_id) REFERENCES caregiver(caregiver_id),
    CONSTRAINT fk_incident_supervisor
        FOREIGN KEY (responder_supervisor_id) REFERENCES supervisor(supervisor_id)
) ENGINE=InnoDB;

CREATE TABLE incident_log (
    log_id          INT AUTO_INCREMENT PRIMARY KEY,
    incident_id     INT NOT NULL,
    actor           VARCHAR(150) NOT NULL,
    action          VARCHAR(255) NOT NULL,
    timestamp       DATETIME NOT NULL,
    CONSTRAINT fk_incidentlog_incident
        FOREIGN KEY (incident_id) REFERENCES incident(incident_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Credential
-- ---------------------------------------------------------------------
CREATE TABLE credential (
    credential_id               INT AUTO_INCREMENT PRIMARY KEY,
    caregiver_id                 INT NOT NULL,
    reviewed_by_supervisor_id     INT,
    type                          VARCHAR(100) NOT NULL,
    expiry_date                   DATE NOT NULL,
    status                        VARCHAR(20) NOT NULL DEFAULT 'Valid',
    CONSTRAINT fk_credential_caregiver
        FOREIGN KEY (caregiver_id) REFERENCES caregiver(caregiver_id),
    CONSTRAINT fk_credential_supervisor
        FOREIGN KEY (reviewed_by_supervisor_id) REFERENCES supervisor(supervisor_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Spot check
-- ---------------------------------------------------------------------
CREATE TABLE spot_check (
    spot_check_id           INT AUTO_INCREMENT PRIMARY KEY,
    elder_id                 INT NOT NULL,
    caregiver_id              INT NOT NULL,
    supervisor_id             INT NOT NULL,
    family_approval_status    VARCHAR(20) DEFAULT 'Pending',
    finding                   VARCHAR(255),
    CONSTRAINT fk_spotcheck_elder
        FOREIGN KEY (elder_id) REFERENCES elder(elder_id),
    CONSTRAINT fk_spotcheck_caregiver
        FOREIGN KEY (caregiver_id) REFERENCES caregiver(caregiver_id),
    CONSTRAINT fk_spotcheck_supervisor
        FOREIGN KEY (supervisor_id) REFERENCES supervisor(supervisor_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- FAMILY_MEMBER approves SPOT_CHECK — bridge column added after
-- both tables exist (family_member was created earlier without this FK)
-- ---------------------------------------------------------------------
ALTER TABLE spot_check
    ADD COLUMN approved_by_family_member_id INT NULL,
    ADD CONSTRAINT fk_spotcheck_familymember
        FOREIGN KEY (approved_by_family_member_id) REFERENCES family_member(family_member_id);

-- ---------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------
CREATE TABLE report (
    report_id       INT AUTO_INCREMENT PRIMARY KEY,
    elder_id        INT NOT NULL,
    supervisor_id   INT NOT NULL,
    audience        VARCHAR(30) NOT NULL,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Draft',
    CONSTRAINT fk_report_elder
        FOREIGN KEY (elder_id) REFERENCES elder(elder_id),
    CONSTRAINT fk_report_supervisor
        FOREIGN KEY (supervisor_id) REFERENCES supervisor(supervisor_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
