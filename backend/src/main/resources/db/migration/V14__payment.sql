-- Phase 2.5: Stripe payment integration fields on orders table

ALTER TABLE orders
    ADD COLUMN stripe_payment_intent_id VARCHAR(100) NULL,
    ADD COLUMN payment_status ENUM('UNPAID','AWAITING','PAID','REFUNDED','PARTIALLY_REFUNDED','FAILED')
        NOT NULL DEFAULT 'UNPAID',
    ADD COLUMN paid_at TIMESTAMP(6) NULL,
    ADD COLUMN stripe_refund_id VARCHAR(100) NULL,
    ADD COLUMN refunded_amount_cents INT NULL,
    ADD COLUMN refunded_at TIMESTAMP(6) NULL;

CREATE INDEX idx_order_payment_status ON orders(payment_status);
CREATE INDEX idx_order_stripe_intent ON orders(stripe_payment_intent_id);
