-- Phase 2.1: Persisted audit events for key mutations
-- Stores high-value audit events (auth, order, ledger, complaint, rating, etc.)

CREATE TABLE audit_event (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(64) NOT NULL,
    actor_role VARCHAR(20) NOT NULL,
    actor_id VARCHAR(64) NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id VARCHAR(64) NULL,
    summary VARCHAR(500) NOT NULL,
    metadata_json TEXT NULL,
    ip_address VARCHAR(64) NULL,
    user_agent VARCHAR(255) NULL,
    duration_ms INT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE INDEX idx_audit_created_at ON audit_event(created_at);
CREATE INDEX idx_audit_request_id ON audit_event(request_id);
CREATE INDEX idx_audit_actor_created ON audit_event(actor_role, actor_id, created_at);
CREATE INDEX idx_audit_entity_created ON audit_event(entity_type, entity_id, created_at);
CREATE INDEX idx_audit_action_created ON audit_event(action, created_at);
