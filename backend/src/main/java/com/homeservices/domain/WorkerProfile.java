package com.homeservices.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "account_id", nullable = false, unique = true, columnDefinition = "CHAR(36)")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID accountId;

    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    @Column(name = "merchant_id", nullable = false, columnDefinition = "CHAR(36)")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID merchantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability", nullable = false, length = 20, columnDefinition = "VARCHAR(20)")
    @Builder.Default
    private WorkerAvailability availability = WorkerAvailability.OFFLINE;

    @Column(name = "home_address", length = 500)
    private String homeAddress;

    @Column(name = "home_lat")
    private Double homeLat;

    @Column(name = "home_lng")
    private Double homeLng;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
