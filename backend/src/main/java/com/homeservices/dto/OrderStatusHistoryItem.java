package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class OrderStatusHistoryItem {

    private UUID id;
    private String fromStatus;
    private String toStatus;
    private String actorRole;
    private UUID actorId;
    private String reason;
    private Instant createdAt;
}
