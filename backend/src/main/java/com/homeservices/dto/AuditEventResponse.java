package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
public class AuditEventResponse {

    private Long id;
    private String requestId;
    private String actorRole;
    private String actorId;
    private String action;
    private String entityType;
    private String entityId;
    private String summary;
    private Map<String, Object> metadata;
    private String ipAddress;
    private String userAgent;
    private Integer durationMs;
    private Instant createdAt;
}
