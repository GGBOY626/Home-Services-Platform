package com.homeservices.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.homeservices.config.RequestIdFilter;
import com.homeservices.domain.AuditEvent;
import com.homeservices.dto.AuditEventCreate;
import com.homeservices.repository.AuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditEventService {

    private final AuditEventRepository auditEventRepository;
    private final ObjectMapper objectMapper;

    /**
     * Records an audit event asynchronously. Runs in a separate transaction to avoid impacting the caller.
     * Metadata is serialized to JSON; sensitive fields (password, token, secret) are never stored.
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuditEventCreate cmd) {
        persist(cmd);
    }

    /** Synchronous record for use in contexts where @Async is not suitable (e.g. scheduled jobs). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordSync(AuditEventCreate cmd) {
        persist(cmd);
    }

    /** Records audit event with current request context (MDC) captured before async execution. */
    public void recordWithContext(String actorRole, String actorId, String action, String entityType,
                                  String entityId, String summary, java.util.Map<String, Object> metadata, Integer durationMs) {
        AuditEventCreate cmd = AuditEventCreate.builder()
            .requestId(MDC.get(RequestIdFilter.MDC_REQUEST_ID))
            .ipAddress(MDC.get(RequestIdFilter.MDC_IP_ADDRESS))
            .userAgent(MDC.get(RequestIdFilter.MDC_USER_AGENT))
            .actorRole(actorRole)
            .actorId(actorId)
            .action(action)
            .entityType(entityType)
            .entityId(entityId)
            .summary(summary)
            .metadata(metadata)
            .durationMs(durationMs)
            .build();
        record(cmd);
    }

    private void persist(AuditEventCreate cmd) {
        String requestId = cmd.getRequestId();
        if (requestId == null || requestId.isBlank()) {
            requestId = MDC.get(RequestIdFilter.MDC_REQUEST_ID);
        }
        if (requestId == null || requestId.isBlank()) {
            requestId = "SYSTEM-JOB";
        }
        String ip = cmd.getIpAddress();
        if (ip == null || ip.isBlank()) ip = MDC.get(RequestIdFilter.MDC_IP_ADDRESS);
        String ua = cmd.getUserAgent();
        if (ua == null || ua.isBlank()) ua = MDC.get(RequestIdFilter.MDC_USER_AGENT);
        String metadataJson = null;
        if (cmd.getMetadata() != null && !cmd.getMetadata().isEmpty()) {
            Map<String, Object> safe = maskSensitive(cmd.getMetadata());
            try {
                metadataJson = objectMapper.writeValueAsString(safe);
            } catch (JsonProcessingException ignored) {
                metadataJson = "{}";
            }
        }
        AuditEvent event = AuditEvent.builder()
            .requestId(requestId)
            .actorRole(cmd.getActorRole() != null ? cmd.getActorRole() : "SYSTEM")
            .actorId(truncate(cmd.getActorId(), 64))
            .action(cmd.getAction())
            .entityType(truncate(cmd.getEntityType(), 50))
            .entityId(truncate(cmd.getEntityId(), 64))
            .summary(truncate(cmd.getSummary(), 500))
            .metadataJson(metadataJson)
            .ipAddress(truncate(ip, 64))
            .userAgent(truncate(ua, 255))
            .durationMs(cmd.getDurationMs())
            .build();
        auditEventRepository.save(event);
    }

    private static Map<String, Object> maskSensitive(Map<String, Object> m) {
        return m.entrySet().stream()
            .filter(e -> {
                String k = e.getKey().toLowerCase();
                return !k.contains("password") && !k.contains("token") && !k.contains("secret");
            })
            .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
}
