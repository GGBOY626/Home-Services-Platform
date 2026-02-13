package com.homeservices.controller;

import com.homeservices.dto.OrderResponse;
import com.homeservices.dto.RejectRequest;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.CurrentUserService;
import com.homeservices.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/worker/orders")
@RequiredArgsConstructor
@Tag(name = "Worker", description = "Worker endpoints")
public class WorkerOrderController {

    private final OrderService orderService;
    private final CurrentUserService currentUserService;

    @GetMapping
    @Operation(summary = "List orders assigned to me")
    public ResponseEntity<Page<OrderResponse>> list(@AuthenticationPrincipal JwtPrincipal principal,
                                                      @PageableDefault(size = 20) Pageable pageable) {
        UUID workerId = currentUserService.getWorkerId(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        return ResponseEntity.ok(orderService.findByWorkerId(workerId, pageable, principal));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order by ID (must be assigned to me)")
    public ResponseEntity<OrderResponse> get(@PathVariable UUID id,
                                             @AuthenticationPrincipal JwtPrincipal principal) {
        UUID workerId = currentUserService.getWorkerId(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        OrderResponse order = orderService.getById(id, principal);
        if (order.getWorkerId() == null || !order.getWorkerId().equals(workerId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(order);
    }

    @PostMapping("/{id}/accept")
    @Operation(summary = "Accept an assigned order")
    public ResponseEntity<OrderResponse> accept(@PathVariable UUID id,
                                                  @AuthenticationPrincipal JwtPrincipal principal) {
        UUID workerId = currentUserService.getWorkerId(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        OrderResponse response = orderService.accept(id, workerId, principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Mark order as completed")
    public ResponseEntity<OrderResponse> complete(@PathVariable UUID id,
                                                    @AuthenticationPrincipal JwtPrincipal principal) {
        UUID workerId = currentUserService.getWorkerId(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        OrderResponse response = orderService.complete(id, workerId, principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject assigned order (return to MERCHANT_ASSIGNED, clear worker)")
    public ResponseEntity<OrderResponse> reject(@PathVariable UUID id,
                                                @RequestBody(required = false) RejectRequest request,
                                                @AuthenticationPrincipal JwtPrincipal principal) {
        UUID workerId = currentUserService.getWorkerId(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        OrderResponse response = orderService.rejectByWorker(id, request != null ? request.getReason() : null, workerId, principal);
        return ResponseEntity.ok(response);
    }
}
