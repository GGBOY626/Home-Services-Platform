package com.homeservices.domain;

import jakarta.persistence.*;
import lombok.*;

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

    @Column(name = "merchant_id")
    private UUID merchantId;

    @Column(name = "worker_id")
    private UUID workerId;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "cancel_reason", length = 255)
    private String cancelReason;

    @Column(name = "cancelled_by_role", length = 20)
    private String cancelledByRole;

    @Column(name = "cancelled_by_id")
    private UUID cancelledById;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "merchant_assign_deadline")
    private Instant merchantAssignDeadline;

    @Column(name = "worker_accept_deadline")
    private Instant workerAcceptDeadline;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

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
