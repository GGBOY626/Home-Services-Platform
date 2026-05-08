package com.homeservices.service;

import com.homeservices.config.StripeProperties;
import com.homeservices.domain.Order;
import com.homeservices.domain.OrderStatus;
import com.homeservices.domain.PaymentStatus;
import com.homeservices.dto.CreatePaymentIntentResponse;
import com.homeservices.dto.OrderResponse;
import com.homeservices.repository.OrderRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.StripeObject;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StripeService {

    private final StripeProperties stripeProperties;
    private final OrderRepository orderRepository;
    private final OrderService orderService;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeProperties.getSecretKey();
    }

    @Transactional
    public CreatePaymentIntentResponse createPaymentIntent(UUID orderId, UUID userId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (!order.getCreatedBy().equals(userId)) {
            throw new SecurityException("Not your order");
        }
        if (order.getStatus() != OrderStatus.PLACED) {
            throw new IllegalStateException("Payment only allowed when order is PLACED. Current: " + order.getStatus());
        }
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalStateException("Order is already paid");
        }

        // Reuse existing intent if one was already created
        if (order.getStripePaymentIntentId() != null && order.getPaymentStatus() == PaymentStatus.AWAITING) {
            try {
                PaymentIntent existing = PaymentIntent.retrieve(order.getStripePaymentIntentId());
                if ("requires_payment_method".equals(existing.getStatus()) || "requires_confirmation".equals(existing.getStatus())) {
                    return buildResponse(existing, order);
                }
            } catch (StripeException e) {
                log.warn("Could not retrieve existing PaymentIntent {}, will create new one", order.getStripePaymentIntentId());
            }
        }

        try {
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount((long) order.getPriceCents())
                .setCurrency("nzd")
                .setDescription("HomeServices order " + orderId + " - " + order.getServiceNameSnapshot())
                .putMetadata("orderId", orderId.toString())
                .putMetadata("userId", userId.toString())
                .setAutomaticPaymentMethods(
                    PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                        .setEnabled(true)
                        .setAllowRedirects(PaymentIntentCreateParams.AutomaticPaymentMethods.AllowRedirects.NEVER)
                        .build()
                )
                .build();

            PaymentIntent intent = PaymentIntent.create(params);

            order.setStripePaymentIntentId(intent.getId());
            order.setPaymentStatus(PaymentStatus.AWAITING);
            orderRepository.save(order);

            return buildResponse(intent, order);
        } catch (StripeException e) {
            log.error("Stripe PaymentIntent creation failed for order {}: {}", orderId, e.getMessage());
            throw new RuntimeException("Payment initialisation failed: " + e.getMessage(), e);
        }
    }

    @Transactional
    public OrderResponse handleWebhookEvent(String payload, String sigHeader) {
        Event event;
        if (stripeProperties.getWebhookSecret() != null && !stripeProperties.getWebhookSecret().isBlank()) {
            try {
                event = Webhook.constructEvent(payload, sigHeader, stripeProperties.getWebhookSecret());
            } catch (SignatureVerificationException e) {
                throw new SecurityException("Invalid Stripe webhook signature");
            }
        } else {
            // No webhook secret configured — parse without verification (dev only)
            event = Event.GSON.fromJson(payload, Event.class);
        }

        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        Optional<StripeObject> stripeObjectOpt = deserializer.getObject();

        switch (event.getType()) {
            case "payment_intent.succeeded" -> stripeObjectOpt.ifPresent(obj -> {
                PaymentIntent intent = (PaymentIntent) obj;
                markOrderPaid(intent.getId());
            });
            case "payment_intent.payment_failed" -> stripeObjectOpt.ifPresent(obj -> {
                PaymentIntent intent = (PaymentIntent) obj;
                markOrderFailed(intent.getId());
            });
            case "charge.refunded" -> {
                // Handled by the explicit refund endpoint; webhook is supplemental
            }
            default -> log.debug("Unhandled Stripe event type: {}", event.getType());
        }
        return null;
    }

    @Transactional
    public OrderResponse issueRefund(UUID orderId, Integer amountCents, String reason) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (order.getPaymentStatus() != PaymentStatus.PAID) {
            throw new IllegalStateException("Cannot refund an order that is not PAID. Current: " + order.getPaymentStatus());
        }
        if (order.getStripePaymentIntentId() == null) {
            throw new IllegalStateException("No Stripe PaymentIntent found for this order");
        }

        try {
            RefundCreateParams.Builder refundBuilder = RefundCreateParams.builder()
                .setPaymentIntent(order.getStripePaymentIntentId());

            if (amountCents != null && amountCents > 0) {
                refundBuilder.setAmount((long) amountCents);
            }
            if (reason != null && !reason.isBlank()) {
                refundBuilder.setReason(RefundCreateParams.Reason.FRAUDULENT);
            }

            Refund refund = Refund.create(refundBuilder.build());

            boolean isPartial = amountCents != null && amountCents < order.getPriceCents();

            order.setStripeRefundId(refund.getId());
            order.setRefundedAmountCents(amountCents != null ? amountCents : order.getPriceCents());
            order.setRefundedAt(Instant.now());
            order.setPaymentStatus(isPartial ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED);
            order = orderRepository.save(order);

            log.info("Refund {} issued for order {} ({})", refund.getId(), orderId, isPartial ? "partial" : "full");
            return orderService.toResponse(order);
        } catch (StripeException e) {
            log.error("Stripe refund failed for order {}: {}", orderId, e.getMessage());
            throw new RuntimeException("Refund failed: " + e.getMessage(), e);
        }
    }

    /** Called by the user frontend after Stripe.confirmCardPayment succeeds (dev-friendly fallback). */
    @Transactional
    public OrderResponse markOrderPaidByUser(UUID orderId, String paymentIntentId, UUID userId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (!order.getCreatedBy().equals(userId)) {
            throw new SecurityException("Not your order");
        }
        if (!paymentIntentId.equals(order.getStripePaymentIntentId())) {
            throw new IllegalArgumentException("PaymentIntent ID does not match order");
        }
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            return orderService.toResponse(order);
        }
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setPaidAt(Instant.now());
        order = orderRepository.save(order);
        log.info("Order {} marked PAID by user confirmation (intent: {})", orderId, paymentIntentId);
        return orderService.toResponse(order);
    }

    private void markOrderPaid(String paymentIntentId) {
        orderRepository.findByStripePaymentIntentId(paymentIntentId).ifPresent(order -> {
            if (order.getPaymentStatus() != PaymentStatus.PAID) {
                order.setPaymentStatus(PaymentStatus.PAID);
                order.setPaidAt(Instant.now());
                orderRepository.save(order);
                log.info("Order {} marked PAID via webhook (intent: {})", order.getId(), paymentIntentId);
            }
        });
    }

    private void markOrderFailed(String paymentIntentId) {
        orderRepository.findByStripePaymentIntentId(paymentIntentId).ifPresent(order -> {
            if (order.getPaymentStatus() == PaymentStatus.AWAITING) {
                order.setPaymentStatus(PaymentStatus.FAILED);
                orderRepository.save(order);
                log.info("Order {} marked FAILED via webhook (intent: {})", order.getId(), paymentIntentId);
            }
        });
    }

    private CreatePaymentIntentResponse buildResponse(PaymentIntent intent, Order order) {
        return CreatePaymentIntentResponse.builder()
            .clientSecret(intent.getClientSecret())
            .publishableKey(stripeProperties.getPublishableKey())
            .paymentIntentId(intent.getId())
            .orderId(order.getId().toString())
            .amountCents(order.getPriceCents())
            .currency("nzd")
            .build();
    }
}
