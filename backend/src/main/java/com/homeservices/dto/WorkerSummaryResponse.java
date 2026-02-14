package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class WorkerSummaryResponse {

    private UUID id;
    private UUID accountId;
    private String displayName;
    private String availability;
    private Instant lastSeenAt;
}
