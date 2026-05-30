package com.homeservices.controller;

import com.homeservices.domain.Order;
import com.homeservices.domain.PaymentStatus;
import com.homeservices.dto.OrderResponse;
import com.homeservices.dto.PaymentEventLogDTO;
import com.homeservices.dto.PaymentSummaryDTO;
import com.homeservices.dto.ReconciliationResultDTO;
import com.homeservices.dto.RefundRequest;
import com.homeservices.repository.OrderRepository;
import com.homeservices.repository.PaymentEventLogRepository;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.PaymentReconciliationService;
import com.homeservices.service.StripeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
@Tag(name = "Admin Payments", description = "Payment and refund management for admins")
public class AdminPaymentController {

    private final StripeService stripeService;
    private final OrderRepository orderRepository;
    private final PaymentEventLogRepository paymentEventLogRepository;
    private final PaymentReconciliationService paymentReconciliationService;

    @GetMapping
    @Operation(summary = "List all orders with payment info (paginated)")
    public ResponseEntity<Page<PaymentSummaryDTO>> listPayments(
            @RequestParam(required = false) PaymentStatus paymentStatus,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<Order> orders = orderRepository.findAllByOrderByCreatedAtDesc(pageable);
        List<PaymentSummaryDTO> dtos = orders.getContent().stream()
            .filter(o -> paymentStatus == null || o.getPaymentStatus() == paymentStatus)
            .map(this::toPaymentSummary)
            .toList();
        return ResponseEntity.ok(new PageImpl<>(dtos, pageable, orders.getTotalElements()));
    }

    @PostMapping("/{orderId}/refund")
    @Operation(summary = "Issue a Stripe refund for a paid order")
    public ResponseEntity<OrderResponse> refund(
            @PathVariable UUID orderId,
            @RequestBody(required = false) RefundRequest request,
            @AuthenticationPrincipal JwtPrincipal principal) {
        Integer amountCents = request != null ? request.getAmountCents() : null;
        String reason = request != null ? request.getReason() : null;
        OrderResponse response = stripeService.issueRefund(orderId, amountCents, reason);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{orderId}/events")
    @Operation(summary = "Get payment event log for a specific order")
    public ResponseEntity<List<PaymentEventLogDTO>> getPaymentEvents(@PathVariable UUID orderId) {
        List<PaymentEventLogDTO> events = paymentEventLogRepository
            .findByOrderIdOrderByCreatedAtAsc(orderId.toString())
            .stream()
            .map(e -> PaymentEventLogDTO.builder()
                .id(e.getId())
                .orderId(e.getOrderId())
                .eventType(e.getEventType())
                .oldStatus(e.getOldStatus())
                .newStatus(e.getNewStatus())
                .actor(e.getActor())
                .stripeRef(e.getStripeRef())
                .amountCents(e.getAmountCents())
                .note(e.getNote())
                .createdAt(e.getCreatedAt())
                .build())
            .toList();
        return ResponseEntity.ok(events);
    }

    @PostMapping("/reconciliation")
    @Operation(summary = "Trigger on-demand payment reconciliation against Stripe")
    public ResponseEntity<ReconciliationResultDTO> runReconciliation() {
        return ResponseEntity.ok(paymentReconciliationService.runAndReport());
    }

    private PaymentSummaryDTO toPaymentSummary(Order order) {
        return PaymentSummaryDTO.builder()
            .orderId(order.getId())
            .serviceNameSnapshot(order.getServiceNameSnapshot())
            .priceCents(order.getPriceCents())
            .orderStatus(order.getStatus())
            .paymentStatus(order.getPaymentStatus())
            .stripePaymentIntentId(order.getStripePaymentIntentId())
            .stripeRefundId(order.getStripeRefundId())
            .paidAt(order.getPaidAt())
            .refundedAmountCents(order.getRefundedAmountCents())
            .refundedAt(order.getRefundedAt())
            .createdAt(order.getCreatedAt())
            .build();
    }
}
