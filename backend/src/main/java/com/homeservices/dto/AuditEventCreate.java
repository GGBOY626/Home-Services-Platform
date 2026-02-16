package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class AuditEventCreate {

    private String requestId;
    private String ipAddress;
    private String userAgent;
    private String actorRole;
    private String actorId;
    private String action;
    private String entityType;
    private String entityId;
    private String summary;
    private Map<String, Object> metadata;
    private Integer durationMs;
}
