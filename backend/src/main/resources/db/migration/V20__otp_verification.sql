-- V20: OTP verification for worker-customer handshake
ALTER TABLE orders
    ADD COLUMN otp_code VARCHAR(6) NULL,
    ADD COLUMN otp_generated_at DATETIME NULL,
    ADD COLUMN otp_expires_at DATETIME NULL,
    ADD COLUMN otp_verified_at DATETIME NULL;
