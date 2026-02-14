package com.homeservices.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "platform_fee_rule", indexes = {
    @Index(name = "idx_platform_fee_rule_active_scope", columnList = "is_active, scope"),
    @Index(name = "idx_platform_fee_rule_scope_category", columnList = "scope, category_id, is_active"),
    @Index(name = "idx_platform_fee_rule_effective", columnList = "effective_from, effective_to")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformFeeRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FeeRuleScope scope;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "fee_rate_bps", nullable = false)
    private Integer feeRateBps;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "effective_from", nullable = false)
    private Instant effectiveFrom;

    @Column(name = "effective_to")
    private Instant effectiveTo;

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
