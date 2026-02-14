-- Phase 1.1: cancellation, rejection, timeout handling
-- Extend order status enum
ALTER TABLE orders
    MODIFY COLUMN status ENUM(
        'PLACED', 'MERCHANT_ASSIGNED', 'WORKER_ASSIGNED',
        'ACCEPTED', 'COMPLETED', 'CLOSED', 'CANCELLED', 'EXPIRED'
    ) NOT NULL;

-- Cancellation fields
ALTER TABLE orders
    ADD COLUMN cancel_reason VARCHAR(255) NULL,
    ADD COLUMN cancelled_by_role VARCHAR(20) NULL,
    ADD COLUMN cancelled_by_id CHAR(36) NULL,
    ADD COLUMN cancelled_at TIMESTAMP(6) NULL;

-- Deadlines for timeout handling
ALTER TABLE orders
    ADD COLUMN merchant_assign_deadline TIMESTAMP(6) NULL,
    ADD COLUMN worker_accept_deadline TIMESTAMP(6) NULL;

-- Optimistic locking
ALTER TABLE orders
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

-- Indexes for status + composite and deadline queries
CREATE INDEX idx_order_merchant_status ON orders(merchant_id, status);
CREATE INDEX idx_order_worker_status ON orders(worker_id, status);
CREATE INDEX idx_order_merchant_assign_deadline ON orders(merchant_assign_deadline);
CREATE INDEX idx_order_worker_accept_deadline ON orders(worker_accept_deadline);

-- Optional: order status history for timeline
CREATE TABLE order_status_history (
    id CHAR(36) NOT NULL PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    from_status VARCHAR(30) NULL,
    to_status VARCHAR(30) NOT NULL,
    actor_role VARCHAR(20) NULL,
    actor_id CHAR(36) NULL,
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_order_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
