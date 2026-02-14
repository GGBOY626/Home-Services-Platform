-- Phase 1.2: Service catalog and merchant pricing
-- New tables: service_category, service_item, merchant_service
-- Order: replace service_type with service_item_id + snapshots

-- Service categories
CREATE TABLE service_category (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);
CREATE INDEX idx_service_category_code ON service_category(code);
CREATE INDEX idx_service_category_active_sort ON service_category(is_active, sort_order);

-- Service items (per category)
CREATE TABLE service_item (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500) NULL,
    base_price_cents INT NOT NULL,
    duration_minutes INT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_service_item_category FOREIGN KEY (category_id) REFERENCES service_category(id) ON DELETE RESTRICT
);
CREATE INDEX idx_service_item_category ON service_item(category_id);
CREATE INDEX idx_service_item_code ON service_item(code);

-- Merchant-specific offerings and price override
CREATE TABLE merchant_service (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    merchant_id CHAR(36) NOT NULL,
    service_item_id BIGINT NOT NULL,
    price_cents INT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_merchant_service_merchant FOREIGN KEY (merchant_id) REFERENCES merchant_profile(id) ON DELETE CASCADE,
    CONSTRAINT fk_merchant_service_item FOREIGN KEY (service_item_id) REFERENCES service_item(id) ON DELETE RESTRICT,
    CONSTRAINT uq_merchant_service UNIQUE (merchant_id, service_item_id)
);
CREATE INDEX idx_merchant_service_merchant ON merchant_service(merchant_id);
CREATE INDEX idx_merchant_service_item ON merchant_service(service_item_id);

-- Orders: add new columns (nullable first for backfill)
ALTER TABLE orders
    ADD COLUMN service_item_id BIGINT NULL,
    ADD COLUMN service_name_snapshot VARCHAR(255) NULL,
    ADD COLUMN price_cents INT NULL,
    ADD COLUMN duration_minutes_snapshot INT NULL;

-- Seed categories (ids 1, 2, 3)
INSERT INTO service_category (id, code, name, description, is_active, sort_order) VALUES
(1, 'CLEANING', 'Cleaning', 'Home cleaning services', 1, 0),
(2, 'CURTAIN_INSTALL', 'Curtain Installation', 'Professional curtain fitting', 1, 1),
(3, 'MAINTENANCE', 'Maintenance', 'Repairs and general maintenance', 1, 2);

-- Seed service items (ids 1, 2, 3)
INSERT INTO service_item (id, category_id, code, name, description, base_price_cents, duration_minutes, is_active) VALUES
(1, 1, 'CLEANING_BASIC', 'Basic Cleaning', 'Standard home cleaning', 8000, 120, 1),
(2, 2, 'CURTAIN_INSTALL_STANDARD', 'Standard Curtain Installation', 'Curtain fitting service', 12000, 180, 1),
(3, 3, 'MAINTENANCE_GENERAL', 'General Maintenance', 'Repairs and maintenance', 10000, 120, 1);

-- Merchant service: Demo merchant offers CLEANING_BASIC with override 7500
INSERT INTO merchant_service (merchant_id, service_item_id, price_cents, is_active) VALUES
('b0000000-0000-0000-0000-000000000001', 1, 7500, 1);

-- Backfill existing orders: set service_item_id=1 (CLEANING_BASIC) and snapshots
UPDATE orders
SET service_item_id = 1,
    service_name_snapshot = 'Basic Cleaning',
    price_cents = 8000,
    duration_minutes_snapshot = 120
WHERE service_item_id IS NULL;

-- Make new columns non-null and add FK; drop service_type
ALTER TABLE orders
    MODIFY COLUMN service_item_id BIGINT NOT NULL,
    MODIFY COLUMN service_name_snapshot VARCHAR(255) NOT NULL,
    MODIFY COLUMN price_cents INT NOT NULL,
    MODIFY COLUMN duration_minutes_snapshot INT NOT NULL,
    ADD CONSTRAINT fk_order_service_item FOREIGN KEY (service_item_id) REFERENCES service_item(id) ON DELETE RESTRICT;

CREATE INDEX idx_order_service_item ON orders(service_item_id);

ALTER TABLE orders DROP COLUMN service_type;
