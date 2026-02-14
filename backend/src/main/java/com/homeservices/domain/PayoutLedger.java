package com.homeservices.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payout_ledger", indexes = {
    @Index(name = "idx_payout_ledger_merchant_status", columnList = "merchant_id, status"),
    @Index(name = "idx_payout_ledger_created_at", columnList = "created_at")
}, uniqueConstraints = @UniqueConstraint(name = "uq_payout_ledger_order", columnNames = "order_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayoutLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false, unique = true, columnDefinition = "CHAR(36)")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID orderId;

    @Column(name = "merchant_id", nullable = false, columnDefinition = "CHAR(36)")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID merchantId;

    @Column(name = "gross_amount_cents", nullable = false)
    private Integer grossAmountCents;

    @Column(name = "platform_fee_cents", nullable = false)
    private Integer platformFeeCents;

    @Column(name = "merchant_net_cents", nullable = false)
    private Integer merchantNetCents;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LedgerStatus status;

    @Column(name = "calculated_at", nullable = false)
    private Instant calculatedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
