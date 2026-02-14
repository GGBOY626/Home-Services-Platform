package com.homeservices.controller;

import com.homeservices.config.AuditLogging;
import com.homeservices.domain.WorkerAvailability;
import com.homeservices.domain.WorkerProfile;
import com.homeservices.dto.AssignWorkerRequest;
import com.homeservices.dto.OrderResponse;
import com.homeservices.dto.RejectRequest;
import com.homeservices.dto.WorkerSummaryResponse;
import com.homeservices.repository.WorkerProfileRepository;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.CurrentUserService;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/merchant")
@RequiredArgsConstructor
@Tag(name = "Merchant", description = "Merchant endpoints")
public class MerchantOrderController {

    private final OrderService orderService;
    private final CurrentUserService currentUserService;
    private final WorkerProfileRepository workerProfileRepository;

    @GetMapping("/orders")
    @Operation(summary = "List orders assigned to my merchant")
    public ResponseEntity<Page<OrderResponse>> listOrders(@AuthenticationPrincipal JwtPrincipal principal,
                                                           @PageableDefault(size = 20) Pageable pageable) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        return ResponseEntity.ok(orderService.findByMerchantId(merchantId, pageable, principal));
    }

    @GetMapping("/orders/{id}")
    @Operation(summary = "Get order by ID (must belong to my merchant)")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID id,
                                                   @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        OrderResponse order = orderService.getById(id, principal);
        if (order.getMerchantId() == null || !order.getMerchantId().equals(merchantId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(order);
    }

    @GetMapping("/workers")
    @Operation(summary = "List my workers (optional filter: availability=ONLINE)")
    public ResponseEntity<List<WorkerSummaryResponse>> listWorkers(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestParam(required = false) String availability) {
        long start = System.currentTimeMillis();
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        List<WorkerProfile> workers;
        if ("ONLINE".equalsIgnoreCase(availability)) {
            workers = workerProfileRepository.findByMerchantIdAndAvailability(merchantId, WorkerAvailability.ONLINE);
        } else {
            workers = workerProfileRepository.findByMerchantId(merchantId);
        }
        List<WorkerSummaryResponse> list = workers.stream()
            .map(this::toWorkerSummary)
            .collect(Collectors.toList());
        AuditLogging.logWithActor("READ", "WorkerProfile", "merchantId=" + merchantId + ",availability=" + availability,
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return ResponseEntity.ok(list);
    }

    private WorkerSummaryResponse toWorkerSummary(WorkerProfile w) {
        return WorkerSummaryResponse.builder()
            .id(w.getId())
            .accountId(w.getAccountId())
            .displayName(w.getDisplayName())
            .availability(w.getAvailability().name())
            .lastSeenAt(w.getLastSeenAt())
            .build();
    }

    @PostMapping("/orders/{id}/assign-worker")
    @Operation(summary = "Assign a worker to an order")
    public ResponseEntity<OrderResponse> assignWorker(@PathVariable UUID id,
                                                       @Valid @RequestBody AssignWorkerRequest request,
                                                       @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        OrderResponse response = orderService.assignWorker(id, request.getWorkerId(), merchantId, principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/orders/{id}/reject")
    @Operation(summary = "Reject order (return to PLACED, clear merchant and worker)")
    public ResponseEntity<OrderResponse> reject(@PathVariable UUID id,
                                                 @RequestBody(required = false) RejectRequest request,
                                                 @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        OrderResponse response = orderService.rejectByMerchant(id, request != null ? request.getReason() : null, merchantId, principal);
        return ResponseEntity.ok(response);
    }
}
