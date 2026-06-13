package com.homeservices.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limits POST /api/auth/login to 5 attempts per minute per IP.
 * After exceeding the limit, the IP enters a 15-minute cooldown.
 * <p>
 * Uses Bucket4j token bucket algorithm with a classic (interval-based)
 * refill strategy: 5 tokens regenerated every 60 seconds.
 */
@Slf4j
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration REFILL_PERIOD = Duration.ofMinutes(1);
    private static final Duration COOLDOWN_DURATION = Duration.ofMinutes(15);
    private static final String LOGIN_PATH = "/api/auth/login";

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final Map<String, Instant> cooldowns = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        // Only rate-limit the login endpoint
        if (!isLoginRequest(request)) {
            return true;
        }

        String clientIP = getClientIP(request);

        // 1. Check cooldown block
        Instant cooldownUntil = cooldowns.get(clientIP);
        if (cooldownUntil != null) {
            if (Instant.now().isBefore(cooldownUntil)) {
                long retryAfter = cooldownUntil.getEpochSecond() - Instant.now().getEpochSecond();
                sendRateLimitResponse(response, retryAfter,
                        "Too many login attempts. Please try again in " + retryAfter + " seconds.");
                log.warn("IP {} blocked by cooldown (retry after {}s)", clientIP, retryAfter);
                return false;
            } else {
                // Cooldown expired — remove and let the bucket refill naturally
                cooldowns.remove(clientIP);
                buckets.remove(clientIP);
                log.info("IP {} cooldown expired, bucket reset", clientIP);
            }
        }

        // 2. Check token bucket
        Bucket bucket = buckets.computeIfAbsent(clientIP, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.classic(MAX_ATTEMPTS,
                                Refill.intervally(MAX_ATTEMPTS, REFILL_PERIOD)))
                        .build());

        if (bucket.tryConsume(1)) {
            long remaining = bucket.getAvailableTokens();
            log.debug("IP {} login attempt allowed ({} tokens remaining)", clientIP, remaining);
            return true;
        }

        // 3. Rate limit exceeded — enter cooldown
        cooldowns.put(clientIP, Instant.now().plus(COOLDOWN_DURATION));
        long retryAfter = COOLDOWN_DURATION.getSeconds();
        sendRateLimitResponse(response, retryAfter,
                "Too many login attempts. Please try again in " + retryAfter + " seconds.");

        log.warn("IP {} rate-limited — {} login attempts exceeded, entering {} min cooldown",
                clientIP, MAX_ATTEMPTS, COOLDOWN_DURATION.toMinutes());
        return false;
    }

    private boolean isLoginRequest(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod())
                && LOGIN_PATH.equals(request.getRequestURI());
    }

    private String getClientIP(HttpServletRequest request) {
        // Honour reverse-proxy headers first (Nginx sets X-Forwarded-For / X-Real-IP)
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isBlank()) {
            // X-Forwarded-For may contain a comma-separated chain; the leftmost is the origin
            return xfHeader.split(",")[0].trim();
        }
        String realIP = request.getHeader("X-Real-IP");
        if (realIP != null && !realIP.isBlank()) {
            return realIP.trim();
        }
        return request.getRemoteAddr();
    }

    private void sendRateLimitResponse(HttpServletResponse response,
                                       long retryAfterSeconds,
                                       String message) throws Exception {
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"" + message + "\"}");
    }

    /**
     * Periodic cleanup of expired cooldown entries to prevent memory leaks.
     * Call periodically (e.g., every 15 minutes via @Scheduled).
     */
    public void cleanup() {
        Instant now = Instant.now();
        int removedCooldowns = 0;
        for (Map.Entry<String, Instant> entry : cooldowns.entrySet()) {
            if (now.isAfter(entry.getValue())) {
                cooldowns.remove(entry.getKey());
                buckets.remove(entry.getKey());
                removedCooldowns++;
            }
        }
        if (removedCooldowns > 0) {
            log.debug("Cleaned {} expired rate-limit cooldowns", removedCooldowns);
        }
        if (buckets.size() > 10_000) {
            log.warn("Rate-limit bucket map has {} entries — consider more aggressive cleanup", buckets.size());
        }
    }
}
