package com.homeservices.controller;

import com.homeservices.dto.CompletionProofDTO;
import com.homeservices.dto.OrderResponse;
import com.homeservices.dto.RejectRequest;
import com.homeservices.dto.SetAvailabilityRequest;
import com.homeservices.dto.VerifyOtpRequest;
import com.homeservices.dto.UpdateLocationRequest;
import com.homeservices.dto.WorkerMeResponse;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.CompletionProofService;
import com.homeservices.service.CurrentUserService;
import com.homeservices.service.OrderService;
import com.homeservices.service.WorkerProfileService;
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
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/worker")
@RequiredArgsConstructor
@Tag(name = "Worker", description = "Worker profile, availability and orders")
public class WorkerOrderController {

    private final OrderService orderService;
    private final CompletionProofService completionProofService;
    private final CurrentUserService currentUserService;
    private final WorkerProfileService workerProfileService;

    @GetMapping("/me")
    @Operation(summary = "Get my worker profile (includes availability)")
    public ResponseEntity<WorkerMeResponse> me(@AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(workerProfileService.getMe(principal));
    }

    @PatchMapping("/me/location")
    @Operation(summary = "Set worker home address and coordinates")
    public ResponseEntity<WorkerMeResponse> setLocation(
            @Valid @RequestBody UpdateLocationRequest request,
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(workerProfileService.setLocation(request.getAddress(), request.getLat(), request.getLng(), principal));
    }

    @PostMapping("/availability")
    @Operation(summary = "Set availability (ONLINE or OFFLINE)")
    public ResponseEntity<WorkerMeResponse> setAvailability(
            @Valid @RequestBody SetAvailabilityRequest request,
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(workerProfileService.setAvailability(request.getAvailability(), principal));
    }

    @GetMapping("/orders")
    @Operation(summary = "List orders assigned to me")
    public ResponseEntity<Page<OrderResponse>> list(@AuthenticationPrincipal JwtPrincipal principal,
                                                      @PageableDefault(size = 20) Pageable pageable) {
        UUID workerId = currentUserService.getWorkerId(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        return ResponseEntity.ok(orderService.findByWorkerId(workerId, pageable, principal));
    }

    @GetMapping("/orders/{id}")
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

    @GetMapping("/orders/{id}/completion-proof")
    @Operation(summary = "Get completion proof for order (Worker: assigned orders only)")
    public ResponseEntity<CompletionProofDTO> getCompletionProof(@PathVariable UUID id,
                                                                  @AuthenticationPrincipal JwtPrincipal principal) {
        UUID workerId = currentUserService.getWorkerId(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        OrderResponse order = orderService.getById(id, principal);
        if (order.getWorkerId() == null || !order.getWorkerId().equals(workerId)) {
            return ResponseEntity.notFound().build();
        }
        return completionProofService.getProofForOrder(id, principal)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/orders/{id}/accept")
    @Operation(summary = "Accept an assigned order")
    public ResponseEntity<OrderResponse> accept(@PathVariable UUID id,
                                                  @AuthenticationPrincipal JwtPrincipal principal) {
        UUID workerId = currentUserService.getWorkerId(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        OrderResponse response = orderService.accept(id, workerId, principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/orders/{id}/verify-otp")
    @Operation(summary = "Verify the OTP code provided by the customer")
    public ResponseEntity<OrderResponse> verifyOtp(@PathVariable UUID id,
                                                    @RequestBody VerifyOtpRequest request,
                                                    @AuthenticationPrincipal JwtPrincipal principal) {
        UUID workerId = currentUserService.getWorkerId(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        OrderResponse response = orderService.verifyOtp(id, request.getOtpCode(), workerId, principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/orders/{id}/complete")
    @Operation(summary = "DEPRECATED: Use complete-with-proof. Returns 400 with instructions.")
    public ResponseEntity<OrderResponse> completeDeprecated(@PathVariable UUID id,
                                                            @AuthenticationPrincipal JwtPrincipal principal) {
        throw new IllegalStateException(
            "Use POST /orders/{id}/complete-with-proof with completionNotes (min 10 chars) and optional images.");
    }

    @PostMapping("/orders/{id}/complete-with-proof")
    @Operation(summary = "Submit completion proof and mark order as completed")
    public ResponseEntity<OrderResponse> completeWithProof(@PathVariable UUID id,
                                                           @RequestParam("completionNotes") String completionNotes,
                                                           @RequestParam(value = "labels", required = false) List<String> labels,
                                                           @RequestParam(value = "files", required = false) List<MultipartFile> files,
                                                           @AuthenticationPrincipal JwtPrincipal principal) {
        UUID workerId = currentUserService.getWorkerId(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        List<MultipartFile> fileList = files != null ? files : new ArrayList<>();
        List<String> labelList = labels != null ? labels : new ArrayList<>();
        OrderResponse response = completionProofService.submitProof(id, workerId, completionNotes, fileList, labelList, principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/orders/{id}/reject")
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
