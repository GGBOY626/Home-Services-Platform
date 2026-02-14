package com.homeservices.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "worker_profile")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "account_id", nullable = false, unique = true)
    private UUID accountId;

    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    @Column(name = "merchant_id", nullable = false)
    private UUID merchantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability", nullable = false, length = 20, columnDefinition = "VARCHAR(20)")
    @Builder.Default
    private WorkerAvailability availability = WorkerAvailability.OFFLINE;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
