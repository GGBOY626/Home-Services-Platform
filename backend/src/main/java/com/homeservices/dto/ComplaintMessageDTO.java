package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ComplaintMessageDTO {

    private Long id;
    private String actorRole;
    private UUID actorId;
    private String message;
    private Instant createdAt;
}
