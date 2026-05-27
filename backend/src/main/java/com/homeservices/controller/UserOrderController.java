package com.homeservices.controller;

import com.homeservices.domain.Order;
import com.homeservices.domain.OrderStatus;
import com.homeservices.domain.PaymentStatus;
import com.homeservices.dto.CancelRequest;
import com.homeservices.dto.CompletionProofDTO;
import com.homeservices.dto.RefundRequestDTO;
import com.homeservices.dto.CreateOrderRequest;
import com.homeservices.dto.OrderResponse;
import com.homeservices.dto.OrderStatusHistoryItem;
import com.homeservices.dto.RescheduleRequest;
import com.homeservices.repository.OrderRepository;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.OrderService;
import com.homeservices.service.RefundRequestService;
import com.homeservices.service.StripeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/user/orders")
@RequiredArgsConstructor
@Tag(name = "User Orders", description = "Endpoints for end users (order creators)")
public class UserOrderController {

    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final com.homeservices.service.CompletionProofService completionProofService;
    private final StripeService stripeService;
    private final RefundRequestService refundRequestService;

    @PostMapping
    @Operation(summary = "Create a new order")
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request,
                                                 @AuthenticationPrincipal JwtPrincipal principal) {
        OrderResponse response = orderService.create(request, principal);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "List my orders")
    public ResponseEntity<Page<OrderResponse>> list(@AuthenticationPrincipal JwtPrincipal principal,
                                                      @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(orderService.findByCreatedBy(principal.id(), pageable, principal));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order by ID")
    public ResponseEntity<OrderResponse> get(@PathVariable UUID id,
                                               @AuthenticationPrincipal JwtPrincipal principal) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCreatedBy().equals(principal.id())) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(orderService.getById(id, principal));
    }

    @PostMapping("/{id}/confirm")
    @Operation(summary = "Confirm order completion")
    public ResponseEntity<OrderResponse> confirm(@PathVariable UUID id,
                                                  @AuthenticationPrincipal JwtPrincipal principal) {
        OrderResponse response = orderService.confirmCompletion(id, principal.id(), principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel order. PLACED+PAID → auto-refund. MERCHANT_ASSIGNED+PAID → create refund request for admin.")
    public ResponseEntity<OrderResponse> cancel(@PathVariable UUID id,
                                                 @RequestBody(required = false) CancelRequest request,
                                                 @AuthenticationPrincipal JwtPrincipal principal) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCreatedBy().equals(principal.id())) {
            return ResponseEntity.notFound().build();
        }
        OrderStatus preStatus = order.getStatus();
        PaymentStatus prePayment = order.getPaymentStatus();
        String reason = request != null ? request.getReason() : null;

        OrderResponse response = orderService.cancelByUser(id, reason, principal);

        if (prePayment == PaymentStatus.PAID) {
            if (preStatus == OrderStatus.PLACED) {
                // Auto-refund: order was paid but not yet dispatched
                response = stripeService.issueRefund(id, null, "User cancelled before merchant assignment");
            } else if (preStatus == OrderStatus.MERCHANT_ASSIGNED) {
                // Create pending refund request for admin to decide
                refundRequestService.createForCancelledOrder(id, principal.id(), reason);
            }
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/refund-request")
    @Operation(summary = "Get refund request status for an order (if any)")
    public ResponseEntity<RefundRequestDTO> getRefundRequest(@PathVariable UUID id,
                                                              @AuthenticationPrincipal JwtPrincipal principal) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCreatedBy().equals(principal.id())) {
            return ResponseEntity.notFound().build();
        }
        return refundRequestService.findByOrderId(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/pay-cash")
    @Operation(summary = "Select cash (offline) payment — skips online payment for this order")
    public ResponseEntity<OrderResponse> payCash(@PathVariable UUID id,
                                                  @AuthenticationPrincipal JwtPrincipal principal) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCreatedBy().equals(principal.id())) {
            return ResponseEntity.notFound().build();
        }
        OrderResponse response = orderService.markCashPayment(id, principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reschedule")
    @Operation(summary = "Reschedule appointment time (only when PLACED)")
    public ResponseEntity<OrderResponse> reschedule(@PathVariable UUID id,
                                                     @Valid @RequestBody RescheduleRequest request,
                                                     @AuthenticationPrincipal JwtPrincipal principal) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCreatedBy().equals(principal.id())) {
            return ResponseEntity.notFound().build();
        }
        OrderResponse response = orderService.reschedule(id, request.getScheduledAt(), principal);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/completion-proof")
    @Operation(summary = "Get completion proof for order (User: own orders only)")
    public ResponseEntity<CompletionProofDTO> getCompletionProof(@PathVariable UUID id,
                                                                  @AuthenticationPrincipal JwtPrincipal principal) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCreatedBy().equals(principal.id())) {
            return ResponseEntity.notFound().build();
        }
        return completionProofService.getProofForOrder(id, principal)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get order status history (timeline)")
    public ResponseEntity<List<OrderStatusHistoryItem>> history(@PathVariable UUID id,
                                                                  @AuthenticationPrincipal JwtPrincipal principal) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCreatedBy().equals(principal.id())) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(orderService.getHistory(id, principal));
    }
}
