package com.homeservices.controller;

import com.homeservices.dto.AssignMerchantRequest;
import com.homeservices.dto.CancelRequest;
import com.homeservices.dto.OrderResponse;
import com.homeservices.dto.OrderStatusHistoryItem;
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
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
@Tag(name = "Admin Orders", description = "Platform admin endpoints")
public class AdminOrderController {

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "List all orders")
    public ResponseEntity<Page<OrderResponse>> list(@AuthenticationPrincipal JwtPrincipal principal,
                                                     @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(orderService.findAllForAdmin(pageable, principal));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order by ID")
    public ResponseEntity<OrderResponse> get(@PathVariable UUID id,
                                              @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(orderService.getById(id, principal));
    }

    @PostMapping("/{id}/assign-merchant")
    @Operation(summary = "Assign a merchant to an order")
    public ResponseEntity<OrderResponse> assignMerchant(@PathVariable UUID id,
                                                          @Valid @RequestBody AssignMerchantRequest request,
                                                          @AuthenticationPrincipal JwtPrincipal principal) {
        OrderResponse response = orderService.assignMerchant(id, request.getMerchantId(), principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel order (any status except CLOSED)")
    public ResponseEntity<OrderResponse> cancel(@PathVariable UUID id,
                                                 @RequestBody(required = false) CancelRequest request,
                                                 @AuthenticationPrincipal JwtPrincipal principal) {
        OrderResponse response = orderService.cancelByAdmin(id, request != null ? request.getReason() : null, principal);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get order status history (timeline)")
    public ResponseEntity<List<OrderStatusHistoryItem>> history(@PathVariable UUID id,
                                                                  @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(orderService.getHistory(id, principal));
    }
}
