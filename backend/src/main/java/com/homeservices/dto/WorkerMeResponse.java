package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class WorkerMeResponse {

    private UUID id;
    private UUID accountId;
    private String displayName;
    private String availability;
    private Instant lastSeenAt;
    private String homeAddress;
    private Double homeLat;
    private Double homeLng;
}
