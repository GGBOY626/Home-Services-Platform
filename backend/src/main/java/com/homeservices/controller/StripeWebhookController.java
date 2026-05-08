package com.homeservices.controller;

import com.homeservices.service.StripeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Tag(name = "Webhooks", description = "Stripe webhook receiver (public endpoint)")
public class StripeWebhookController {

    private final StripeService stripeService;

    @PostMapping("/stripe")
    @Operation(summary = "Receive Stripe webhook events")
    public ResponseEntity<Map<String, String>> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {
        try {
            stripeService.handleWebhookEvent(payload, sigHeader);
            return ResponseEntity.ok(Map.of("received", "true"));
        } catch (SecurityException e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            return ResponseEntity.status(400).body(Map.of("error", "Invalid signature"));
        } catch (Exception e) {
            log.error("Stripe webhook processing error: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Webhook processing failed"));
        }
    }
}
