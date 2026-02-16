-- Phase 1.7: Completion Proof (Proof of Work)
-- Worker submits completion notes + attachments when completing; user reviews before confirming CLOSED

CREATE TABLE order_completion_proof (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id CHAR(36) NOT NULL UNIQUE,
    worker_id CHAR(36) NOT NULL,
    completion_notes VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_completion_proof_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_completion_proof_worker FOREIGN KEY (worker_id) REFERENCES worker_profile(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_completion_proof_order ON order_completion_proof(order_id);
CREATE INDEX idx_completion_proof_worker ON order_completion_proof(worker_id);

CREATE TABLE order_completion_attachment (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    proof_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    public_url VARCHAR(500) NOT NULL,
    label VARCHAR(20) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_attachment_proof FOREIGN KEY (proof_id) REFERENCES order_completion_proof(id) ON DELETE CASCADE
);

CREATE INDEX idx_attachment_proof ON order_completion_attachment(proof_id);
CREATE INDEX idx_attachment_created ON order_completion_attachment(created_at);
