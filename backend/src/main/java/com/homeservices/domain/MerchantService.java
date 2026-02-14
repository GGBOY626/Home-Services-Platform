package com.homeservices.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "merchant_service", indexes = {
    @Index(name = "idx_merchant_service_merchant", columnList = "merchant_id"),
    @Index(name = "idx_merchant_service_item", columnList = "service_item_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uq_merchant_service", columnNames = {"merchant_id", "service_item_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MerchantService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "merchant_id", nullable = false)
    private UUID merchantId;

    @Column(name = "service_item_id", nullable = false)
    private Long serviceItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_item_id", insertable = false, updatable = false)
    private ServiceItem serviceItem;

    @Column(name = "price_cents", nullable = false)
    private Integer priceCents;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

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
