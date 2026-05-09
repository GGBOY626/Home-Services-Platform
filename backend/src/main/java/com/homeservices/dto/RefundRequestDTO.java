package com.homeservices.dto;

import com.homeservices.domain.RefundRequestStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class RefundRequestDTO {
    private Long id;
    private UUID orderId;
    private UUID userId;
    private String reason;
    private RefundRequestStatus status;
    private String adminNote;
    private UUID decidedBy;
    private Instant decidedAt;
    private Instant createdAt;
    private Instant updatedAt;
    /** Snapshot fields for admin convenience */
    private String serviceNameSnapshot;
    private Integer priceCents;
}
