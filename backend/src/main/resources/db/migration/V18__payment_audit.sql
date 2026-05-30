-- Stripe webhook event deduplication: prevent same event from being processed twice
CREATE TABLE stripe_webhook_event (
    id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    event_id     VARCHAR(100) NOT NULL,
    event_type   VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uq_stripe_event_id (event_id)
);

-- Payment audit log: every payment state transition is recorded here
CREATE TABLE payment_event_log (
    id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id     CHAR(36)     NOT NULL,
    event_type   VARCHAR(60)  NOT NULL,  -- INTENT_CREATED | PAID_WEBHOOK | PAID_CLIENT | PAYMENT_FAILED | REFUND_ISSUED | CASH_PAYMENT | RECONCILIATION_FIXED
    old_status   VARCHAR(30)  NULL,
    new_status   VARCHAR(30)  NOT NULL,
    actor        VARCHAR(150) NULL,      -- 'webhook:evt_xxx' | 'user:uuid' | 'admin:uuid' | 'system:reconciliation'
    stripe_ref   VARCHAR(100) NULL,      -- paymentIntentId or refundId
    amount_cents INT          NULL,
    note         VARCHAR(500) NULL,
    created_at   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_pel_order_id  (order_id),
    INDEX idx_pel_created_at (created_at)
);
