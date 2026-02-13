-- User accounts (all roles)
-- UUID columns use BINARY(16) to match Hibernate 6 default mapping for java.util.UUID
-- Enum columns use MySQL ENUM to match Hibernate 6 @Enumerated(EnumType.STRING) mapping
CREATE TABLE user_account (
    id BINARY(16) NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'MERCHANT', 'USER', 'WORKER') NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE INDEX idx_user_account_email ON user_account(email);
CREATE INDEX idx_user_account_role ON user_account(role);

-- Merchant profiles (one per merchant account)
CREATE TABLE merchant_profile (
    id BINARY(16) NOT NULL PRIMARY KEY,
    account_id BINARY(16) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    CONSTRAINT fk_merchant_account FOREIGN KEY (account_id) REFERENCES user_account(id) ON DELETE CASCADE
);

CREATE INDEX idx_merchant_profile_account_id ON merchant_profile(account_id);

-- Worker profiles (linked to merchant)
CREATE TABLE worker_profile (
    id BINARY(16) NOT NULL PRIMARY KEY,
    account_id BINARY(16) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    merchant_id BINARY(16) NOT NULL,
    CONSTRAINT fk_worker_account FOREIGN KEY (account_id) REFERENCES user_account(id) ON DELETE CASCADE,
    CONSTRAINT fk_worker_merchant FOREIGN KEY (merchant_id) REFERENCES merchant_profile(id) ON DELETE CASCADE
);

CREATE INDEX idx_worker_profile_merchant_id ON worker_profile(merchant_id);
CREATE INDEX idx_worker_profile_account_id ON worker_profile(account_id);

-- Refresh tokens for JWT
CREATE TABLE refresh_token (
    id BINARY(16) NOT NULL PRIMARY KEY,
    account_id BINARY(16) NOT NULL,
    token VARCHAR(512) NOT NULL UNIQUE,
    expires_at TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_refresh_token_account FOREIGN KEY (account_id) REFERENCES user_account(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_token_account_id ON refresh_token(account_id);
CREATE INDEX idx_refresh_token_token ON refresh_token(token);

-- Orders
CREATE TABLE orders (
    id BINARY(16) NOT NULL PRIMARY KEY,
    service_type ENUM('CLEANING') NOT NULL,
    address VARCHAR(500) NOT NULL,
    notes VARCHAR(1000),
    status ENUM('PLACED', 'MERCHANT_ASSIGNED', 'WORKER_ASSIGNED', 'ACCEPTED', 'COMPLETED', 'CLOSED') NOT NULL,
    merchant_id BINARY(16),
    worker_id BINARY(16),
    created_by BINARY(16) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_order_created_by FOREIGN KEY (created_by) REFERENCES user_account(id),
    CONSTRAINT fk_order_merchant FOREIGN KEY (merchant_id) REFERENCES merchant_profile(id) ON DELETE SET NULL,
    CONSTRAINT fk_order_worker FOREIGN KEY (worker_id) REFERENCES worker_profile(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_status ON orders(status);
CREATE INDEX idx_order_merchant_id ON orders(merchant_id);
CREATE INDEX idx_order_worker_id ON orders(worker_id);
CREATE INDEX idx_order_created_at ON orders(created_at);
CREATE INDEX idx_order_created_by ON orders(created_by);
