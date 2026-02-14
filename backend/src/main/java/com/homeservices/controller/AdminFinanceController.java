package com.homeservices.controller;

import com.homeservices.domain.LedgerStatus;
import com.homeservices.dto.*;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.FeeRuleService;
import com.homeservices.service.FinanceQueryService;
import com.homeservices.service.LedgerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/finance")
@RequiredArgsConstructor
@Tag(name = "Admin Finance", description = "Platform finance summary, ledgers, fee rules")
public class AdminFinanceController {

    private final FinanceQueryService financeQueryService;
    private final LedgerService ledgerService;
    private final FeeRuleService feeRuleService;

    @GetMapping("/summary")
    @Operation(summary = "Finance summary for date range")
    public ResponseEntity<FinanceSummaryDTO> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(financeQueryService.getAdminSummary(from, to, principal));
    }

    @GetMapping("/ledgers")
    @Operation(summary = "Paginated ledger list with filters")
    public ResponseEntity<Page<PayoutLedgerDTO>> getLedgers(
            @RequestParam(required = false) UUID merchantId,
            @RequestParam(required = false) LedgerStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(financeQueryService.getLedgersForAdmin(merchantId, status, from, to, pageable, principal));
    }

    @PostMapping("/ledgers/{id}/mark-paid")
    @Operation(summary = "Mark ledger as PAID (mock payout)")
    public ResponseEntity<PayoutLedgerDTO> markPaid(@PathVariable Long id,
                                                    @AuthenticationPrincipal JwtPrincipal principal) {
        var ledger = ledgerService.markAsPaid(id, principal);
        return ResponseEntity.ok(toDTO(ledger));
    }

    @GetMapping("/fee-rules")
    @Operation(summary = "List all fee rules")
    public ResponseEntity<List<PlatformFeeRuleDTO>> getFeeRules(@AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(financeQueryService.getFeeRules(principal));
    }

    @PostMapping("/fee-rules")
    @Operation(summary = "Create fee rule")
    public ResponseEntity<PlatformFeeRuleDTO> createFeeRule(@Valid @RequestBody CreateFeeRuleRequest request,
                                                           @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(feeRuleService.create(request, principal));
    }

    @PutMapping("/fee-rules/{id}")
    @Operation(summary = "Update fee rule")
    public ResponseEntity<PlatformFeeRuleDTO> updateFeeRule(@PathVariable Long id,
                                                           @Valid @RequestBody UpdateFeeRuleRequest request,
                                                           @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(feeRuleService.update(id, request, principal));
    }

    private static PayoutLedgerDTO toDTO(com.homeservices.domain.PayoutLedger l) {
        return PayoutLedgerDTO.builder()
            .id(l.getId())
            .orderId(l.getOrderId())
            .merchantId(l.getMerchantId())
            .grossAmountCents(l.getGrossAmountCents())
            .platformFeeCents(l.getPlatformFeeCents())
            .merchantNetCents(l.getMerchantNetCents())
            .status(l.getStatus())
            .calculatedAt(l.getCalculatedAt())
            .paidAt(l.getPaidAt())
            .createdAt(l.getCreatedAt())
            .build();
    }
}
