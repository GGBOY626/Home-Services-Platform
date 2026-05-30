package com.homeservices.service;

import com.homeservices.config.StripeProperties;
import com.homeservices.domain.Order;
import com.homeservices.domain.PaymentStatus;
import com.homeservices.dto.ReconciliationResultDTO;
import com.homeservices.repository.OrderRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentReconciliationService {

    private final OrderRepository orderRepository;
    private final StripeService stripeService;
    private final StripeProperties stripeProperties;

    /**
     * Run every hour. Finds AWAITING orders older than 30 minutes and checks their
     * actual status in Stripe — fixing any divergence between Stripe and our DB.
     */
    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void reconcile() {
        if (stripeProperties.getSecretKey() == null || stripeProperties.getSecretKey().isBlank()) {
            return;
        }
        Stripe.apiKey = stripeProperties.getSecretKey();
        Instant cutoff = Instant.now().minus(30, ChronoUnit.MINUTES);
        List<Order> staleAwaitingOrders = orderRepository.findByPaymentStatusAndCreatedAtBefore(
            PaymentStatus.AWAITING, cutoff);

        if (staleAwaitingOrders.isEmpty()) return;

        log.info("Reconciliation: checking {} stale AWAITING orders", staleAwaitingOrders.size());
        int fixed = 0;
        for (Order order : staleAwaitingOrders) {
            if (order.getStripePaymentIntentId() == null) continue;
            try {
                PaymentIntent intent = PaymentIntent.retrieve(order.getStripePaymentIntentId());
                switch (intent.getStatus()) {
                    case "succeeded" -> {
                        if (order.getPaymentStatus() != PaymentStatus.PAID) {
                            PaymentStatus old = order.getPaymentStatus();
                            order.setPaymentStatus(PaymentStatus.PAID);
                            order.setPaidAt(Instant.now());
                            orderRepository.save(order);
                            stripeService.logEvent(order.getId(), "RECONCILIATION_FIXED", old, PaymentStatus.PAID,
                                "system:reconciliation", intent.getId(), order.getPriceCents(),
                                "Stripe status was succeeded but DB was " + old);
                            log.warn("Reconciliation FIXED order {} AWAITING→PAID (intent {})", order.getId(), intent.getId());
                            fixed++;
                        }
                    }
                    case "canceled", "requires_payment_method" -> {
                        if (order.getPaymentStatus() == PaymentStatus.AWAITING) {
                            PaymentStatus old = order.getPaymentStatus();
                            order.setPaymentStatus(PaymentStatus.FAILED);
                            orderRepository.save(order);
                            stripeService.logEvent(order.getId(), "RECONCILIATION_FIXED", old, PaymentStatus.FAILED,
                                "system:reconciliation", intent.getId(), null,
                                "Stripe status was " + intent.getStatus() + " but DB was AWAITING");
                            log.warn("Reconciliation FIXED order {} AWAITING→FAILED (intent {})", order.getId(), intent.getId());
                            fixed++;
                        }
                    }
                    default -> log.debug("Reconciliation: order {} intent {} status={} — no action needed",
                        order.getId(), intent.getId(), intent.getStatus());
                }
            } catch (StripeException e) {
                log.error("Reconciliation: failed to retrieve intent {} for order {}: {}",
                    order.getStripePaymentIntentId(), order.getId(), e.getMessage());
            }
        }
        log.info("Reconciliation complete: checked={} fixed={}", staleAwaitingOrders.size(), fixed);
    }

    /** On-demand reconciliation for admin UI — same logic, returns report. */
    @Transactional
    public ReconciliationResultDTO runAndReport() {
        if (stripeProperties.getSecretKey() == null || stripeProperties.getSecretKey().isBlank()) {
            return ReconciliationResultDTO.builder()
                .ranAt(Instant.now()).checkedCount(0).fixedCount(0)
                .items(List.of()).build();
        }
        Stripe.apiKey = stripeProperties.getSecretKey();
        Instant cutoff = Instant.now().minus(30, ChronoUnit.MINUTES);
        List<Order> orders = orderRepository.findByPaymentStatusAndCreatedAtBefore(PaymentStatus.AWAITING, cutoff);

        List<ReconciliationResultDTO.ReconciliationItem> items = new ArrayList<>();
        int fixed = 0;

        for (Order order : orders) {
            if (order.getStripePaymentIntentId() == null) continue;
            try {
                PaymentIntent intent = PaymentIntent.retrieve(order.getStripePaymentIntentId());
                String action = "OK";
                switch (intent.getStatus()) {
                    case "succeeded" -> {
                        if (order.getPaymentStatus() != PaymentStatus.PAID) {
                            PaymentStatus old = order.getPaymentStatus();
                            order.setPaymentStatus(PaymentStatus.PAID);
                            order.setPaidAt(Instant.now());
                            orderRepository.save(order);
                            stripeService.logEvent(order.getId(), "RECONCILIATION_FIXED", old, PaymentStatus.PAID,
                                "system:reconciliation", intent.getId(), order.getPriceCents(),
                                "Fixed by manual reconciliation");
                            action = "FIXED_PAID";
                            fixed++;
                        }
                    }
                    case "canceled", "requires_payment_method" -> {
                        if (order.getPaymentStatus() == PaymentStatus.AWAITING) {
                            PaymentStatus old = order.getPaymentStatus();
                            order.setPaymentStatus(PaymentStatus.FAILED);
                            orderRepository.save(order);
                            stripeService.logEvent(order.getId(), "RECONCILIATION_FIXED", old, PaymentStatus.FAILED,
                                "system:reconciliation", intent.getId(), null,
                                "Fixed by manual reconciliation");
                            action = "FIXED_FAILED";
                            fixed++;
                        }
                    }
                }
                items.add(ReconciliationResultDTO.ReconciliationItem.builder()
                    .orderId(order.getId().toString())
                    .stripeIntentId(intent.getId())
                    .stripeStatus(intent.getStatus())
                    .dbStatus(order.getPaymentStatus().name())
                    .action(action)
                    .build());
            } catch (StripeException e) {
                items.add(ReconciliationResultDTO.ReconciliationItem.builder()
                    .orderId(order.getId().toString())
                    .stripeIntentId(order.getStripePaymentIntentId())
                    .stripeStatus("ERROR: " + e.getMessage())
                    .dbStatus(order.getPaymentStatus().name())
                    .action("SKIPPED")
                    .build());
            }
        }

        return ReconciliationResultDTO.builder()
            .ranAt(Instant.now())
            .checkedCount(orders.size())
            .fixedCount(fixed)
            .items(items)
            .build();
    }
}
