package com.homeservices.controller;

import com.homeservices.domain.RefundRequestStatus;
import com.homeservices.dto.DecideRefundRequest;
import com.homeservices.dto.RefundRequestDTO;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.RefundRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/refund-requests")
@RequiredArgsConstructor
@Tag(name = "Admin Refund Requests", description = "Review and action user refund requests")
public class AdminRefundRequestController {

    private final RefundRequestService refundRequestService;

    @GetMapping
    @Operation(summary = "List all refund requests (optionally filter by status)")
    public ResponseEntity<Page<RefundRequestDTO>> list(
            @RequestParam(required = false) RefundRequestStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<RefundRequestDTO> page = status != null
            ? refundRequestService.listByStatus(status, pageable)
            : refundRequestService.listAll(pageable);
        return ResponseEntity.ok(page);
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve refund request — triggers Stripe refund")
    public ResponseEntity<RefundRequestDTO> approve(
            @PathVariable Long id,
            @RequestBody(required = false) DecideRefundRequest body,
            @AuthenticationPrincipal JwtPrincipal principal) {
        Integer amount = body != null ? body.getRefundAmountCents() : null;
        String note = body != null ? body.getAdminNote() : null;
        return ResponseEntity.ok(refundRequestService.approve(id, amount, note, principal));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject refund request — no refund issued")
    public ResponseEntity<RefundRequestDTO> reject(
            @PathVariable Long id,
            @RequestBody(required = false) DecideRefundRequest body,
            @AuthenticationPrincipal JwtPrincipal principal) {
        String note = body != null ? body.getAdminNote() : null;
        return ResponseEntity.ok(refundRequestService.reject(id, note, principal));
    }
}
