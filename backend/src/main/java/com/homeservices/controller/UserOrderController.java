package com.homeservices.controller;

import com.homeservices.domain.Order;
import com.homeservices.dto.CancelRequest;
import com.homeservices.dto.CreateOrderRequest;
import com.homeservices.dto.OrderResponse;
import com.homeservices.dto.OrderStatusHistoryItem;
import com.homeservices.repository.OrderRepository;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
                                                      @PageableDefault(size = 20) Pageable pageable) {
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
    @Operation(summary = "Cancel order (only when PLACED or MERCHANT_ASSIGNED)")
    public ResponseEntity<OrderResponse> cancel(@PathVariable UUID id,
                                                 @RequestBody(required = false) CancelRequest request,
                                                 @AuthenticationPrincipal JwtPrincipal principal) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCreatedBy().equals(principal.id())) {
            return ResponseEntity.notFound().build();
        }
        OrderResponse response = orderService.cancelByUser(id, request != null ? request.getReason() : null, principal);
        return ResponseEntity.ok(response);
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
