-- Add CASH_PENDING to payment_status ENUM to support offline cash payment
ALTER TABLE orders MODIFY COLUMN payment_status
    ENUM('UNPAID','AWAITING','PAID','REFUNDED','PARTIALLY_REFUNDED','FAILED','CASH_PENDING')
    NOT NULL DEFAULT 'UNPAID';
