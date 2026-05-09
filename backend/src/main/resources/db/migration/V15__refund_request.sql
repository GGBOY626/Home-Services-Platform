-- Phase 2.6: Refund request table (for paid orders cancelled after merchant assignment)

CREATE TABLE refund_request (
    id           BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id     CHAR(36) NOT NULL,
    user_id      CHAR(36) NOT NULL,
    reason       VARCHAR(500) NULL,
    status       ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    admin_note   VARCHAR(500) NULL,
    decided_by   CHAR(36) NULL,
    decided_at   TIMESTAMP(6) NULL,
    created_at   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_refund_request_order UNIQUE (order_id)
);

CREATE INDEX idx_refund_request_status ON refund_request(status);
CREATE INDEX idx_refund_request_user   ON refund_request(user_id);
