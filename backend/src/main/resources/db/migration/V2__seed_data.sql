-- Demo users: password is Password123! (bcrypt)
-- UUIDs inserted as BINARY(16) via UNHEX(REPLACE(uuid, '-', ''))
INSERT INTO user_account (id, email, password_hash, role, status, created_at) VALUES
(UNHEX(REPLACE('a0000000-0000-0000-0000-000000000001', '-', '')), 'admin@demo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN', 'ACTIVE', CURRENT_TIMESTAMP(6)),
(UNHEX(REPLACE('a0000000-0000-0000-0000-000000000002', '-', '')), 'merchant@demo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'MERCHANT', 'ACTIVE', CURRENT_TIMESTAMP(6)),
(UNHEX(REPLACE('a0000000-0000-0000-0000-000000000003', '-', '')), 'worker1@demo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'WORKER', 'ACTIVE', CURRENT_TIMESTAMP(6)),
(UNHEX(REPLACE('a0000000-0000-0000-0000-000000000004', '-', '')), 'worker2@demo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'WORKER', 'ACTIVE', CURRENT_TIMESTAMP(6)),
(UNHEX(REPLACE('a0000000-0000-0000-0000-000000000005', '-', '')), 'user@demo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'USER', 'ACTIVE', CURRENT_TIMESTAMP(6));

-- Merchant profile for merchant@demo.com
INSERT INTO merchant_profile (id, account_id, display_name) VALUES
(UNHEX(REPLACE('b0000000-0000-0000-0000-000000000001', '-', '')), UNHEX(REPLACE('a0000000-0000-0000-0000-000000000002', '-', '')), 'Demo Cleaning Co');

-- Worker profiles (linked to Demo Cleaning Co merchant)
INSERT INTO worker_profile (id, account_id, display_name, merchant_id) VALUES
(UNHEX(REPLACE('c0000000-0000-0000-0000-000000000001', '-', '')), UNHEX(REPLACE('a0000000-0000-0000-0000-000000000003', '-', '')), 'Worker One', UNHEX(REPLACE('b0000000-0000-0000-0000-000000000001', '-', ''))),
(UNHEX(REPLACE('c0000000-0000-0000-0000-000000000002', '-', '')), UNHEX(REPLACE('a0000000-0000-0000-0000-000000000004', '-', '')), 'Worker Two', UNHEX(REPLACE('b0000000-0000-0000-0000-000000000001', '-', '')));
