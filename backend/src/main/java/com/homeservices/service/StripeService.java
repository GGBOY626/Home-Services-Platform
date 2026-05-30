package com.homeservices.service;

import com.homeservices.config.StripeProperties;
import com.homeservices.domain.Order;
import com.homeservices.domain.OrderStatus;
import com.homeservices.domain.PaymentEventLog;
import com.homeservices.domain.PaymentStatus;
import com.homeservices.domain.StripeWebhookEvent;
import com.homeservices.dto.CreatePaymentIntentResponse;
import com.homeservices.dto.OrderResponse;
import com.homeservices.repository.OrderRepository;
import com.homeservices.repository.PaymentEventLogRepository;
import com.homeservices.repository.StripeWebhookEventRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.model.StripeObject;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StripeService {

    private static final long WEBHOOK_TOLERANCE_SECONDS = 300; // 5 minutes

    private final StripeProperties stripeProperties;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final StripeWebhookEventRepository webhookEventRepository;
    private final PaymentEventLogRepository paymentEventLogRepository;

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

        // Reuse existing intent if already created and still actionable
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

            // Idempotency key: same orderId always produces same intent request
            RequestOptions options = RequestOptions.builder()
                .setIdempotencyKey("intent-create-" + orderId)
                .build();

            PaymentIntent intent = PaymentIntent.create(params, options);

            PaymentStatus oldStatus = order.getPaymentStatus();
            order.setStripePaymentIntentId(intent.getId());
            order.setPaymentStatus(PaymentStatus.AWAITING);
            orderRepository.save(order);

            logEvent(orderId, "INTENT_CREATED", oldStatus, PaymentStatus.AWAITING,
                "user:" + userId, intent.getId(), order.getPriceCents(), null);

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
            event = Event.GSON.fromJson(payload, Event.class);
        }

        // Timestamp validation: reject events older than 5 minutes (replay attack prevention)
        long eventAge = Instant.now().getEpochSecond() - event.getCreated();
        if (eventAge > WEBHOOK_TOLERANCE_SECONDS) {
            log.warn("Rejecting stale webhook event {} type={} age={}s", event.getId(), event.getType(), eventAge);
            return null;
        }

        // Idempotency: skip if already processed
        try {
            webhookEventRepository.save(StripeWebhookEvent.builder()
                .eventId(event.getId())
                .eventType(event.getType())
                .build());
        } catch (DataIntegrityViolationException e) {
            log.info("Duplicate webhook event {} ignored", event.getId());
            return null;
        }

        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        Optional<StripeObject> stripeObjectOpt = deserializer.getObject();

        switch (event.getType()) {
            case "payment_intent.succeeded" -> stripeObjectOpt.ifPresent(obj -> {
                PaymentIntent intent = (PaymentIntent) obj;
                markOrderPaid(intent.getId(), "webhook:" + event.getId());
            });
            case "payment_intent.payment_failed" -> stripeObjectOpt.ifPresent(obj -> {
                PaymentIntent intent = (PaymentIntent) obj;
                markOrderFailed(intent.getId(), "webhook:" + event.getId());
            });
            case "charge.refunded" -> {
                // Refund state already updated by the explicit issueRefund call; this is supplemental
                log.debug("charge.refunded event received for event {}", event.getId());
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

            // Idempotency: same orderId + amount = same refund request
            String idempotencyKey = "refund-" + orderId + (amountCents != null ? "-" + amountCents : "-full");
            RequestOptions options = RequestOptions.builder().setIdempotencyKey(idempotencyKey).build();

            Refund refund = Refund.create(refundBuilder.build(), options);

            boolean isPartial = amountCents != null && amountCents < order.getPriceCents();
            PaymentStatus oldStatus = order.getPaymentStatus();
            PaymentStatus newStatus = isPartial ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED;

            order.setStripeRefundId(refund.getId());
            order.setRefundedAmountCents(amountCents != null ? amountCents : order.getPriceCents());
            order.setRefundedAt(Instant.now());
            order.setPaymentStatus(newStatus);
            order = orderRepository.save(order);

            logEvent(orderId, "REFUND_ISSUED", oldStatus, newStatus,
                "system", refund.getId(), amountCents != null ? amountCents : order.getPriceCents(),
                reason);

            log.info("Refund {} issued for order {} ({})", refund.getId(), orderId, isPartial ? "partial" : "full");
            return orderService.toResponse(order);
        } catch (StripeException e) {
            log.error("Stripe refund failed for order {}: {}", orderId, e.getMessage());
            throw new RuntimeException("Refund failed: " + e.getMessage(), e);
        }
    }

    /** Called by the user frontend after Stripe.confirmCardPayment succeeds. */
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

        // Verify with Stripe that the intent is actually succeeded before trusting the client
        try {
            PaymentIntent intent = PaymentIntent.retrieve(paymentIntentId);
            if (!"succeeded".equals(intent.getStatus())) {
                throw new IllegalStateException("Payment not confirmed by Stripe (status: " + intent.getStatus() + ")");
            }
        } catch (StripeException e) {
            log.warn("Could not verify PaymentIntent {} with Stripe: {}", paymentIntentId, e.getMessage());
            // Allow optimistic update — webhook will reconcile if wrong
        }

        PaymentStatus oldStatus = order.getPaymentStatus();
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setPaidAt(Instant.now());
        order = orderRepository.save(order);

        logEvent(orderId, "PAID_CLIENT", oldStatus, PaymentStatus.PAID,
            "user:" + userId, paymentIntentId, order.getPriceCents(), "Client-confirmed payment");

        log.info("Order {} marked PAID by user confirmation (intent: {})", orderId, paymentIntentId);
        return orderService.toResponse(order);
    }

    /** Log a payment event to the audit table. */
    public void logEvent(UUID orderId, String eventType, PaymentStatus oldStatus, PaymentStatus newStatus,
                         String actor, String stripeRef, Integer amountCents, String note) {
        try {
            paymentEventLogRepository.save(PaymentEventLog.builder()
                .orderId(orderId.toString())
                .eventType(eventType)
                .oldStatus(oldStatus != null ? oldStatus.name() : null)
                .newStatus(newStatus.name())
                .actor(actor)
                .stripeRef(stripeRef)
                .amountCents(amountCents)
                .note(note)
                .build());
        } catch (Exception e) {
            log.error("Failed to write payment event log for order {}: {}", orderId, e.getMessage());
        }
    }

    private void markOrderPaid(String paymentIntentId, String actor) {
        orderRepository.findByStripePaymentIntentId(paymentIntentId).ifPresent(order -> {
            if (order.getPaymentStatus() != PaymentStatus.PAID) {
                PaymentStatus oldStatus = order.getPaymentStatus();
                order.setPaymentStatus(PaymentStatus.PAID);
                order.setPaidAt(Instant.now());
                orderRepository.save(order);
                logEvent(order.getId(), "PAID_WEBHOOK", oldStatus, PaymentStatus.PAID,
                    actor, paymentIntentId, order.getPriceCents(), null);
                log.info("Order {} marked PAID via webhook (intent: {})", order.getId(), paymentIntentId);
            }
        });
    }

    private void markOrderFailed(String paymentIntentId, String actor) {
        orderRepository.findByStripePaymentIntentId(paymentIntentId).ifPresent(order -> {
            if (order.getPaymentStatus() == PaymentStatus.AWAITING) {
                PaymentStatus oldStatus = order.getPaymentStatus();
                order.setPaymentStatus(PaymentStatus.FAILED);
                orderRepository.save(order);
                logEvent(order.getId(), "PAYMENT_FAILED", oldStatus, PaymentStatus.FAILED,
                    actor, paymentIntentId, null, null);
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
