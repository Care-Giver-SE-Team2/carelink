-- Elderly Care System - Elderly Role Tables
-- MySQL 8.4 compatible
-- Generated for import into Navicat

CREATE DATABASE IF NOT EXISTS elderly_care_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE elderly_care_system;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS renewal_decision;
DROP TABLE IF EXISTS service_feedback;
DROP TABLE IF EXISTS value_added_service_request;
DROP TABLE IF EXISTS emergency_alert;
DROP TABLE IF EXISTS elderly_family_binding;
DROP TABLE IF EXISTS service_order;
DROP TABLE IF EXISTS value_added_service;
DROP TABLE IF EXISTS caregiver;
DROP TABLE IF EXISTS family_member;
DROP TABLE IF EXISTS elderly;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Common user account table
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ELDERLY','FAMILY','CAREGIVER','ADMIN') NOT NULL,
    status ENUM('ACTIVE','INACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Elderly profile
CREATE TABLE elderly (
    elderly_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    gender ENUM('MALE','FEMALE','OTHER') NULL,
    date_of_birth DATE NULL,
    phone VARCHAR(20) NULL,
    address VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_elderly_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 3. Family member profile
CREATE TABLE family_member (
    family_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_family_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. Caregiver profile (minimal dependency table)
CREATE TABLE caregiver (
    caregiver_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    status ENUM('AVAILABLE','BUSY','INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_caregiver_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 5. EL04: elderly-family binding
CREATE TABLE elderly_family_binding (
    binding_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    elderly_id BIGINT NOT NULL,
    family_id BIGINT NOT NULL,
    relationship VARCHAR(50) NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('PENDING','ACTIVE','REJECTED','UNBOUND') NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_elderly_family UNIQUE (elderly_id, family_id),
    CONSTRAINT fk_binding_elderly
        FOREIGN KEY (elderly_id) REFERENCES elderly(elderly_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_binding_family
        FOREIGN KEY (family_id) REFERENCES family_member(family_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 6. Service order, shared by EL01 and FM09
CREATE TABLE service_order (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    elderly_id BIGINT NOT NULL,
    caregiver_id BIGINT NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    start_time DATETIME NULL,
    end_time DATETIME NULL,
    status ENUM(
        'PENDING',
        'ASSIGNED',
        'IN_PROGRESS',
        'AWAITING_CONFIRMATION',
        'COMPLETED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',
    elderly_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_elderly
        FOREIGN KEY (elderly_id) REFERENCES elderly(elderly_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_order_caregiver
        FOREIGN KEY (caregiver_id) REFERENCES caregiver(caregiver_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 7. EL01 / FM09: service feedback and caregiver rating
CREATE TABLE service_feedback (
    feedback_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL UNIQUE,
    elderly_id BIGINT NOT NULL,
    caregiver_id BIGINT NOT NULL,
    rating TINYINT NOT NULL,
    comment TEXT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_feedback_order
        FOREIGN KEY (order_id) REFERENCES service_order(order_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_feedback_elderly
        FOREIGN KEY (elderly_id) REFERENCES elderly(elderly_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_feedback_caregiver
        FOREIGN KEY (caregiver_id) REFERENCES caregiver(caregiver_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 8. FM09: renewal decision
CREATE TABLE renewal_decision (
    renewal_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    elderly_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    caregiver_id BIGINT NOT NULL,
    decision ENUM('RENEW','NOT_RENEW') NOT NULL,
    renewal_period INT NULL COMMENT 'Renewal period, e.g. number of months',
    reason VARCHAR(500) NULL,
    status ENUM('PENDING','PROCESSING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_renewal_period CHECK (renewal_period IS NULL OR renewal_period > 0),
    CONSTRAINT fk_renewal_elderly
        FOREIGN KEY (elderly_id) REFERENCES elderly(elderly_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_renewal_order
        FOREIGN KEY (order_id) REFERENCES service_order(order_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_renewal_caregiver
        FOREIGN KEY (caregiver_id) REFERENCES caregiver(caregiver_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 9. EL02: value-added service catalogue
CREATE TABLE value_added_service (
    service_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    service_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('AVAILABLE','UNAVAILABLE') NOT NULL DEFAULT 'AVAILABLE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_value_service_price CHECK (price >= 0)
) ENGINE=InnoDB;

-- 10. EL02: value-added service request
CREATE TABLE value_added_service_request (
    request_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    elderly_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    order_id BIGINT NULL,
    requested_time DATETIME NULL,
    quantity INT NOT NULL DEFAULT 1,
    remark VARCHAR(500) NULL,
    status ENUM(
        'PENDING',
        'APPROVED',
        'REJECTED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_request_quantity CHECK (quantity > 0),
    CONSTRAINT fk_request_elderly
        FOREIGN KEY (elderly_id) REFERENCES elderly(elderly_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_request_service
        FOREIGN KEY (service_id) REFERENCES value_added_service(service_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_request_order
        FOREIGN KEY (order_id) REFERENCES service_order(order_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 11. EL03: one-click emergency SOS
CREATE TABLE emergency_alert (
    alert_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    elderly_id BIGINT NOT NULL,
    alert_type ENUM('SOS','MEDICAL','FALL','OTHER') NOT NULL DEFAULT 'SOS',
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    location_text VARCHAR(255) NULL,
    message VARCHAR(500) NULL,
    status ENUM(
        'TRIGGERED',
        'ACKNOWLEDGED',
        'RESPONDING',
        'RESOLVED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'TRIGGERED',
    triggered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME NULL,
    resolved_at DATETIME NULL,
    CONSTRAINT fk_alert_elderly
        FOREIGN KEY (elderly_id) REFERENCES elderly(elderly_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Helpful indexes
CREATE INDEX idx_order_elderly ON service_order(elderly_id);
CREATE INDEX idx_order_caregiver ON service_order(caregiver_id);
CREATE INDEX idx_binding_elderly ON elderly_family_binding(elderly_id);
CREATE INDEX idx_alert_elderly_status ON emergency_alert(elderly_id, status);
CREATE INDEX idx_request_elderly_status ON value_added_service_request(elderly_id, status);
CREATE INDEX idx_feedback_caregiver ON service_feedback(caregiver_id);

-- Optional demo data so the relationships are visible after import
INSERT INTO users (username, password_hash, role) VALUES
('elder_zhang', 'demo_hash', 'ELDERLY'),
('family_zhang', 'demo_hash', 'FAMILY'),
('caregiver_li', 'demo_hash', 'CAREGIVER');

INSERT INTO elderly (user_id, full_name, gender, date_of_birth, phone, address)
VALUES (1, 'Zhang Elder', 'MALE', '1945-05-12', '13800000001', 'Demo Address');

INSERT INTO family_member (user_id, full_name, phone, email)
VALUES (2, 'Zhang Family', '13800000002', 'family@example.com');

INSERT INTO caregiver (user_id, full_name, phone)
VALUES (3, 'Caregiver Li', '13800000003');

INSERT INTO elderly_family_binding
(elderly_id, family_id, relationship, is_primary, status)
VALUES (1, 1, 'Son', TRUE, 'ACTIVE');

INSERT INTO value_added_service (service_name, description, price) VALUES
('Medical Escort', 'Accompany the elderly person to a medical appointment', 50.00),
('Home Haircut', 'Haircut service provided at home', 30.00),
('Deep Cleaning', 'Additional deep cleaning service', 80.00);
