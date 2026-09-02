-- =============================================================================
-- Module: Identity & Family Portal (Updated Full Scope)
-- Engine: MySQL 8.4 LTS
-- Description: Core tables supporting Family Member use cases
--              (UC-FM01 ~ UC-FM10, and cross-cutting UC-EL04)
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Family Members Table
DROP TABLE IF EXISTS `family_members`;
CREATE TABLE `family_members` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL COMMENT 'References users(id) in authentication domain',
    `full_name` VARCHAR(100) NOT NULL,
    `contact_number` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `residential_address` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_family_user_id` (`user_id`),
    KEY `idx_family_contact` (`contact_number`),
    KEY `idx_family_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Profile and contact info for family members';

-- 2. Senior-Family Bindings Table (Updated with pairing_code & requested_by)
DROP TABLE IF EXISTS `senior_family_bindings`;
CREATE TABLE `senior_family_bindings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `senior_id` BIGINT NOT NULL COMMENT 'References seniors(id)',
    `family_member_id` BIGINT DEFAULT NULL COMMENT 'Nullable when elder generates pairing code before family registers',
    `pairing_code` VARCHAR(6) DEFAULT NULL COMMENT '6-digit pairing code initiated by elder (UC-EL04)',
    `relationship` ENUM('SON', 'DAUGHTER', 'SPOUSE', 'GUARDIAN', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `is_primary_contact` TINYINT(1) NOT NULL DEFAULT 0,
    `access_scope` ENUM('FULL', 'READ_ONLY') NOT NULL DEFAULT 'FULL',
    `status` ENUM('PENDING_CONFIRMATION', 'ACTIVE', 'REJECTED', 'REVOKED') NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    `requested_by` ENUM('SENIOR', 'FAMILY_MEMBER') NOT NULL DEFAULT 'SENIOR',
    `confirmed_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_senior_family` (`senior_id`, `family_member_id`),
    KEY `idx_sfb_pairing_code` (`pairing_code`),
    KEY `idx_sfb_family_member` (`family_member_id`),
    KEY `idx_sfb_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bindings and access control between seniors and families';

-- 3. Intake Applications Table (Updated with mobility, care_needs, dialect)
DROP TABLE IF EXISTS `intake_applications`;
CREATE TABLE `intake_applications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `applicant_family_member_id` BIGINT NOT NULL COMMENT 'References family_members(id)',
    `target_senior_name` VARCHAR(100) NOT NULL,
    `target_senior_age` INT DEFAULT NULL,
    `target_address` VARCHAR(255) NOT NULL,
    `postal_code` VARCHAR(10) NOT NULL COMMENT 'Postal sector band for locality matching',
    `mobility_level` ENUM('INDEPENDENT', 'ASSISTIVE_CANE', 'WHEELCHAIR_BEDBOUND') NOT NULL DEFAULT 'INDEPENDENT',
    `preferred_dialects` VARCHAR(100) DEFAULT 'English, Mandarin' COMMENT 'Comma-separated dialects for caregiver matching',
    `care_needs` JSON DEFAULT NULL COMMENT 'Requested tasks: e.g. ["BATHING", "VITALS", "MOBILITY"]',
    `medical_notes` TEXT DEFAULT NULL COMMENT 'Hypertension, diabetes, fall risk notes',
    `status` ENUM('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    `reviewed_by_manager_id` BIGINT DEFAULT NULL COMMENT 'References users(id) of Care Manager',
    `review_remarks` VARCHAR(255) DEFAULT NULL,
    `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `reviewed_at` DATETIME DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_intake_family` (`applicant_family_member_id`),
    KEY `idx_intake_status` (`status`),
    KEY `idx_intake_postal` (`postal_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Intake applications submitted by family members';

-- 4. Periodic Caregiver Reviews Table
DROP TABLE IF EXISTS `periodic_caregiver_reviews`;
CREATE TABLE `periodic_caregiver_reviews` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `family_member_id` BIGINT NOT NULL COMMENT 'References family_members(id)',
    `senior_id` BIGINT NOT NULL COMMENT 'References seniors(id)',
    `caregiver_id` BIGINT NOT NULL COMMENT 'References caregivers(id)',
    `period_start_date` DATE NOT NULL,
    `period_end_date` DATE NOT NULL,
    `overall_rating` TINYINT NOT NULL COMMENT '1 to 5 scale',
    `punctuality_score` TINYINT DEFAULT NULL COMMENT '1 to 5 scale',
    `care_quality_score` TINYINT DEFAULT NULL COMMENT '1 to 5 scale',
    `feedback_notes` TEXT DEFAULT NULL,
    `renewal_decision` ENUM('RENEW_CURRENT', 'REQUEST_CHANGE', 'CANCEL_SERVICE') NOT NULL DEFAULT 'RENEW_CURRENT',
    `reviewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_review_caregiver` (`caregiver_id`),
    KEY `idx_review_senior` (`senior_id`),
    KEY `idx_review_period` (`period_start_date`, `period_end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Periodic service ratings and contract renewal decisions';

-- 5. Urgent Alert Acknowledgments Table
DROP TABLE IF EXISTS `urgent_alert_acknowledgments`;
CREATE TABLE `urgent_alert_acknowledgments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `alert_id` BIGINT NOT NULL COMMENT 'References care_exceptions(id)',
    `family_member_id` BIGINT NOT NULL COMMENT 'References family_members(id)',
    `viewed_at` DATETIME DEFAULT NULL,
    `acknowledged_at` DATETIME DEFAULT NULL,
    `response_note` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_alert_family` (`alert_id`, `family_member_id`),
    KEY `idx_ack_family` (`family_member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit log of family responses to urgent care exception alerts';

-- 6. Home Inspection Consents Table (Should)
DROP TABLE IF EXISTS `home_inspection_consents`;
CREATE TABLE `home_inspection_consents` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `inspection_id` BIGINT NOT NULL COMMENT 'Logical reference to spot-check task ID',
    `senior_id` BIGINT NOT NULL COMMENT 'References seniors(id)',
    `family_member_id` BIGINT NOT NULL COMMENT 'References family_members(id)',
    `proposed_time` DATETIME NOT NULL COMMENT 'Manager planned inspection slot',
    `reason` VARCHAR(255) DEFAULT 'Routine quality spot check' COMMENT 'Reason for inspection',
    `status` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL',
    `decided_at` DATETIME DEFAULT NULL,
    `comments` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_hic_family` (`family_member_id`),
    KEY `idx_hic_senior` (`senior_id`),
    KEY `idx_hic_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Family consents for manager home spot-checks';

-- 7. Value Added Service Orders Table (Should)
DROP TABLE IF EXISTS `value_added_service_orders`;
CREATE TABLE `value_added_service_orders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `senior_id` BIGINT NOT NULL COMMENT 'References seniors(id)',
    `family_member_id` BIGINT NOT NULL COMMENT 'References family_members(id)',
    `service_category` VARCHAR(100) NOT NULL COMMENT 'e.g., HOSPITAL_ESCORT, PHYSIO_ASSIST',
    `requested_schedule` DATETIME NOT NULL,
    `special_instructions` TEXT DEFAULT NULL,
    `status` ENUM('PENDING_APPROVAL', 'APPROVED_DISPATCHED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING_APPROVAL',
    `approved_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_vaso_senior` (`senior_id`),
    KEY `idx_vaso_family` (`family_member_id`),
    KEY `idx_vaso_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Value-added care orders approved by family without monetary billing';

SET FOREIGN_KEY_CHECKS = 1;