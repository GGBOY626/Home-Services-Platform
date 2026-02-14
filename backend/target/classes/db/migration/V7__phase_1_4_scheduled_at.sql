-- Phase 1.4: Appointment scheduling (scheduledAt)

ALTER TABLE orders
    ADD COLUMN scheduled_at TIMESTAMP(6) NULL;

-- Backfill: existing orders get created_at + 1 day
UPDATE orders
SET scheduled_at = DATE_ADD(created_at, INTERVAL 1 DAY)
WHERE scheduled_at IS NULL;

ALTER TABLE orders
    MODIFY COLUMN scheduled_at TIMESTAMP(6) NOT NULL;

CREATE INDEX idx_order_scheduled_at ON orders(scheduled_at);
CREATE INDEX idx_order_merchant_scheduled ON orders(merchant_id, scheduled_at);
CREATE INDEX idx_order_worker_scheduled ON orders(worker_id, scheduled_at);
