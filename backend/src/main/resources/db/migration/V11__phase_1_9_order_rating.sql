-- Phase 1.9: Order-based ratings (one rating per order, after CLOSED)
-- user_id, merchant_id, worker_id use CHAR(36) to match user_account, merchant_profile, worker_profile

CREATE TABLE order_rating (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    merchant_id CHAR(36) NULL,
    worker_id CHAR(36) NULL,
    service_item_id BIGINT NULL,
    stars TINYINT NOT NULL,
    comment VARCHAR(1000) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uk_rating_order UNIQUE (order_id),
    CONSTRAINT fk_rating_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT chk_rating_stars CHECK (stars >= 1 AND stars <= 5)
);

CREATE UNIQUE INDEX idx_rating_order ON order_rating(order_id);
CREATE INDEX idx_rating_merchant_created ON order_rating(merchant_id, created_at);
CREATE INDEX idx_rating_worker_created ON order_rating(worker_id, created_at);
CREATE INDEX idx_rating_service_item_created ON order_rating(service_item_id, created_at);
CREATE INDEX idx_rating_stars ON order_rating(stars);
