package com.homeservices.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Audit-style logging for database and business operations.
 * Sensitive data (passwords, tokens) must be masked by callers.
 */
public final class AuditLogging {

    private static final Logger AUDIT = LoggerFactory.getLogger("AUDIT");

    private AuditLogging() {}

    public static void logRead(String entity, String filters, String pagination, long durationMs) {
        Map<String, Object> m = new HashMap<>();
        m.put("operation", "READ");
        m.put("entity", entity);
        if (filters != null) m.put("filters", filters);
        if (pagination != null) m.put("pagination", pagination);
        m.put("durationMs", durationMs);
        log(m);
    }

    public static void logWrite(String operation, String entity, String primaryIds, long durationMs) {
        Map<String, Object> m = new HashMap<>();
        m.put("operation", operation);
        m.put("entity", entity);
        if (primaryIds != null) m.put("primaryIdentifiers", primaryIds);
        m.put("durationMs", durationMs);
        log(m);
    }

    public static void logAuth(String actorRole, String actorId, String action, boolean success) {
        Map<String, Object> m = new HashMap<>();
        m.put("operation", "AUTH");
        m.put("actorRole", actorRole);
        m.put("actorId", maskIfSensitive(actorId));
        m.put("action", action);
        m.put("success", success);
        log(m);
    }

    public static void logWithActor(String operation, String entity, String primaryIds,
                                    String actorRole, String actorId, long durationMs) {
        Map<String, Object> m = new HashMap<>();
        m.put("requestId", MDC.get(RequestIdFilter.MDC_REQUEST_ID));
        m.put("actorRole", actorRole);
        m.put("actorId", maskIfSensitive(actorId));
        m.put("operation", operation);
        m.put("entity", entity);
        if (primaryIds != null) m.put("primaryIdentifiers", primaryIds);
        m.put("durationMs", durationMs);
        log(m);
    }

    private static void log(Map<String, Object> data) {
        String requestId = MDC.get(RequestIdFilter.MDC_REQUEST_ID);
        if (requestId != null) {
            data.put("requestId", requestId);
        }
        String jsonLike = data.entrySet().stream()
            .map(e -> e.getKey() + "=" + e.getValue())
            .collect(Collectors.joining(" "));
        AUDIT.info("[AUDIT] {}", jsonLike);
    }

    private static String maskIfSensitive(String value) {
        if (value == null) return null;
        if (value.length() <= 8) return "***";
        return value.substring(0, 4) + "***";
    }
}
