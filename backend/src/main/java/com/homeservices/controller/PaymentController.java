package com.homeservices.controller;

import com.homeservices.dto.CreatePaymentIntentResponse;
import com.homeservices.dto.OrderResponse;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.StripeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@Tag(name = "Payment", description = "Stripe payment endpoints for end users")
public class PaymentController {

    private final StripeService stripeService;

    @PostMapping("/create-intent/{orderId}")
    @Operation(summary = "Create a Stripe PaymentIntent for an order (USER)")
    public ResponseEntity<CreatePaymentIntentResponse> createIntent(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal JwtPrincipal principal) {
        CreatePaymentIntentResponse response = stripeService.createPaymentIntent(orderId, principal.id());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/mark-paid/{orderId}")
    @Operation(summary = "Manually mark order as paid after successful Stripe payment (USER, dev fallback)")
    public ResponseEntity<OrderResponse> markPaid(
            @PathVariable UUID orderId,
            @RequestParam String paymentIntentId,
            @AuthenticationPrincipal JwtPrincipal principal) {
        OrderResponse response = stripeService.markOrderPaidByUser(orderId, paymentIntentId, principal.id());
        return ResponseEntity.ok(response);
    }
}
