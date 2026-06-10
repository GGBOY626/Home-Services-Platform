package com.homeservices.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_order_status", columnList = "status"),
    @Index(name = "idx_order_merchant_id", columnList = "merchant_id"),
    @Index(name = "idx_order_worker_id", columnList = "worker_id"),
    @Index(name = "idx_order_created_at", columnList = "created_at"),
    @Index(name = "idx_order_merchant_status", columnList = "merchant_id, status"),
    @Index(name = "idx_order_worker_status", columnList = "worker_id, status"),
    @Index(name = "idx_order_merchant_assign_deadline", columnList = "merchant_assign_deadline"),
    @Index(name = "idx_order_worker_accept_deadline", columnList = "worker_accept_deadline"),
    @Index(name = "idx_order_service_item", columnList = "service_item_id"),
    @Index(name = "idx_order_scheduled_at", columnList = "scheduled_at"),
    @Index(name = "idx_order_merchant_scheduled", columnList = "merchant_id, scheduled_at"),
    @Index(name = "idx_order_worker_scheduled", columnList = "worker_id, scheduled_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "service_item_id", nullable = false)
    private Long serviceItemId;

    @Column(name = "service_name_snapshot", nullable = false, length = 255)
    private String serviceNameSnapshot;

    @Column(name = "price_cents", nullable = false)
    private Integer priceCents;

    @Column(name = "duration_minutes_snapshot", nullable = false)
    private Integer durationMinutesSnapshot;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(length = 1000)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status;

    @Column(name = "merchant_id", columnDefinition = "CHAR(36)")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID merchantId;

    @Column(name = "worker_id", columnDefinition = "CHAR(36)")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID workerId;

    @Column(name = "created_by", nullable = false, columnDefinition = "CHAR(36)")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "cancel_reason", length = 255)
    private String cancelReason;

    @Column(name = "cancelled_by_role", length = 20)
    private String cancelledByRole;

    @Column(name = "cancelled_by_id", columnDefinition = "CHAR(36)")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID cancelledById;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "merchant_assign_deadline")
    private Instant merchantAssignDeadline;

    @Column(name = "worker_accept_deadline")
    private Instant workerAcceptDeadline;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "address_lat")
    private Double addressLat;

    @Column(name = "address_lng")
    private Double addressLng;

    @Column(name = "stripe_payment_intent_id", length = 100)
    private String stripePaymentIntentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 30)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "stripe_refund_id", length = 100)
    private String stripeRefundId;

    @Column(name = "refunded_amount_cents")
    private Integer refundedAmountCents;

    @Column(name = "refunded_at")
    private Instant refundedAt;

    @Column(name = "otp_code", length = 6)
    private String otpCode;

    @Column(name = "otp_generated_at")
    private Instant otpGeneratedAt;

    @Column(name = "otp_expires_at")
    private Instant otpExpiresAt;

    @Column(name = "otp_verified_at")
    private Instant otpVerifiedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = createdAt;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
