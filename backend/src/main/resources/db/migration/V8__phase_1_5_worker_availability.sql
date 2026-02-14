-- Phase 1.5: Worker availability (ONLINE/OFFLINE)

ALTER TABLE worker_profile
    ADD COLUMN availability VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
    ADD COLUMN last_seen_at TIMESTAMP(6) NULL,
    ADD COLUMN updated_at TIMESTAMP(6) NULL;

UPDATE worker_profile SET updated_at = CURRENT_TIMESTAMP(6) WHERE updated_at IS NULL;

CREATE INDEX idx_worker_profile_availability_merchant ON worker_profile(availability, merchant_id);
