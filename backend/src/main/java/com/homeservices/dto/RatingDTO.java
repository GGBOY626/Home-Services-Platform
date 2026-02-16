package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class RatingDTO {

    private Long id;
    private UUID orderId;
    private UUID userId;
    private UUID merchantId;
    private UUID workerId;
    private Long serviceItemId;
    private Integer stars;
    private String comment;
    private Instant createdAt;
    private Instant updatedAt;

    /** Optional: service name snapshot for display */
    private String serviceNameSnapshot;
}
