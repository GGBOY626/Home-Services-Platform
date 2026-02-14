-- Phase 1.3: Ledger-based settlement (no payment integration)
-- Platform fee rules (GLOBAL / CATEGORY) and payout ledger

-- Platform fee rules: scope GLOBAL or CATEGORY, fee in basis points
CREATE TABLE platform_fee_rule (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    scope ENUM('GLOBAL', 'CATEGORY') NOT NULL,
    category_id BIGINT NULL,
    fee_rate_bps INT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    effective_from TIMESTAMP(6) NOT NULL,
    effective_to TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_fee_rule_category FOREIGN KEY (category_id) REFERENCES service_category(id) ON DELETE SET NULL
);

CREATE INDEX idx_platform_fee_rule_active_scope ON platform_fee_rule(is_active, scope);
CREATE INDEX idx_platform_fee_rule_scope_category ON platform_fee_rule(scope, category_id, is_active);
CREATE INDEX idx_platform_fee_rule_effective ON platform_fee_rule(effective_from, effective_to);

-- Payout ledger: one row per CLOSED order, immutable amounts
CREATE TABLE payout_ledger (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    merchant_id CHAR(36) NOT NULL,
    gross_amount_cents INT NOT NULL,
    platform_fee_cents INT NOT NULL,
    merchant_net_cents INT NOT NULL,
    status ENUM('PENDING', 'READY', 'PAID') NOT NULL DEFAULT 'READY',
    calculated_at TIMESTAMP(6) NOT NULL,
    paid_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_payout_ledger_order UNIQUE (order_id),
    CONSTRAINT fk_payout_ledger_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payout_ledger_merchant FOREIGN KEY (merchant_id) REFERENCES merchant_profile(id) ON DELETE RESTRICT
);

CREATE INDEX idx_payout_ledger_merchant_status ON payout_ledger(merchant_id, status);
CREATE INDEX idx_payout_ledger_created_at ON payout_ledger(created_at);

-- Seed: one active GLOBAL rule 12% (1200 bps); avoid duplicate on re-run
INSERT INTO platform_fee_rule (scope, category_id, fee_rate_bps, is_active, effective_from, effective_to)
SELECT 'GLOBAL', NULL, 1200, 1, CURRENT_TIMESTAMP(6), NULL FROM (SELECT 1) t
WHERE NOT EXISTS (SELECT 1 FROM platform_fee_rule WHERE scope = 'GLOBAL' AND is_active = 1);
