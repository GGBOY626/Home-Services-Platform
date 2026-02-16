-- Phase 1.8: Dispute / Complaint (ticketing) system
-- Complaint always linked to an order; user creates; admin manages status; optional messages and attachments

CREATE TABLE complaint_ticket (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    merchant_id CHAR(36) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    category VARCHAR(30) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description VARCHAR(4000) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    resolved_at TIMESTAMP(6) NULL,
    closed_at TIMESTAMP(6) NULL,
    CONSTRAINT fk_complaint_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_complaint_user FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE,
    CONSTRAINT fk_complaint_merchant FOREIGN KEY (merchant_id) REFERENCES merchant_profile(id) ON DELETE SET NULL
);

CREATE INDEX idx_complaint_order_id ON complaint_ticket(order_id);
CREATE INDEX idx_complaint_user_status ON complaint_ticket(user_id, status);
CREATE INDEX idx_complaint_merchant_status ON complaint_ticket(merchant_id, status);
CREATE INDEX idx_complaint_status_created ON complaint_ticket(status, created_at);

CREATE TABLE complaint_message (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    actor_role VARCHAR(20) NOT NULL,
    actor_id CHAR(36) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_message_ticket FOREIGN KEY (ticket_id) REFERENCES complaint_ticket(id) ON DELETE CASCADE
);

CREATE INDEX idx_complaint_message_ticket_created ON complaint_message(ticket_id, created_at);

CREATE TABLE complaint_attachment (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    public_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_attachment_ticket FOREIGN KEY (ticket_id) REFERENCES complaint_ticket(id) ON DELETE CASCADE
);

CREATE INDEX idx_complaint_attachment_ticket ON complaint_attachment(ticket_id);
