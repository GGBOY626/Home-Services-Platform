-- Phase 2.4: Worker and Merchant application tables (application-based registration)

CREATE TABLE worker_application (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(40) NULL,
    city VARCHAR(80) NULL,
    notes VARCHAR(2000) NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    admin_note VARCHAR(1000) NULL,
    decided_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_worker_application_email UNIQUE (email)
);

CREATE INDEX idx_worker_application_status ON worker_application(status);
CREATE INDEX idx_worker_application_created_at ON worker_application(created_at);

CREATE TABLE merchant_application (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    business_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(120) NOT NULL,
    phone VARCHAR(40) NULL,
    address VARCHAR(255) NULL,
    nzbn_or_abn VARCHAR(40) NULL,
    gst_registered BOOLEAN NULL,
    notes VARCHAR(2000) NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    admin_note VARCHAR(1000) NULL,
    decided_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_merchant_application_email UNIQUE (email)
);

CREATE INDEX idx_merchant_application_status ON merchant_application(status);
CREATE INDEX idx_merchant_application_created_at ON merchant_application(created_at);
