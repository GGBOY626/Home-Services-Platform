package com.homeservices.controller;

import com.homeservices.domain.ComplaintStatus;
import com.homeservices.dto.AddComplaintMessageRequest;
import com.homeservices.dto.ComplaintTicketDTO;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.ComplaintService;
import com.homeservices.service.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/merchant/complaints")
@RequiredArgsConstructor
@Tag(name = "Merchant Complaints", description = "View complaints for orders assigned to merchant; add response message")
public class MerchantComplaintController {

    private final ComplaintService complaintService;
    private final CurrentUserService currentUserService;

    @GetMapping
    @Operation(summary = "List complaints for my merchant")
    public ResponseEntity<Page<ComplaintTicketDTO>> list(
            @RequestParam(required = false) ComplaintStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        return ResponseEntity.ok(complaintService.listForMerchant(merchantId, status, from, to, pageable, principal));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get complaint by ID (merchant's orders only)")
    public ResponseEntity<ComplaintTicketDTO> get(@PathVariable Long id,
                                                   @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        return complaintService.getForMerchant(id, merchantId, principal)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/message")
    @Operation(summary = "Add a response message (no status change)")
    public ResponseEntity<ComplaintTicketDTO> addMessage(@PathVariable Long id,
                                                         @Valid @RequestBody AddComplaintMessageRequest request,
                                                         @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        return complaintService.addMerchantMessage(id, merchantId, request.getMessage(), principal)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
