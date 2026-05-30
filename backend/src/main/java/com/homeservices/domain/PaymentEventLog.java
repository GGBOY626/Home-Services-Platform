package com.homeservices.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "payment_event_log")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentEventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false, columnDefinition = "CHAR(36)")
    private String orderId;

    @Column(name = "event_type", nullable = false, length = 60)
    private String eventType;

    @Column(name = "old_status", length = 30)
    private String oldStatus;

    @Column(name = "new_status", nullable = false, length = 30)
    private String newStatus;

    /** 'webhook:evt_xxx' | 'user:uuid' | 'admin:uuid' | 'system:reconciliation' */
    @Column(name = "actor", length = 150)
    private String actor;

    @Column(name = "stripe_ref", length = 100)
    private String stripeRef;

    @Column(name = "amount_cents")
    private Integer amountCents;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
