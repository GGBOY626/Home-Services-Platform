package com.homeservices.controller;

import com.homeservices.domain.LedgerStatus;
import com.homeservices.dto.FinanceSummaryDTO;
import com.homeservices.dto.PayoutLedgerDTO;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.CurrentUserService;
import com.homeservices.service.FinanceQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/merchant/finance")
@RequiredArgsConstructor
@Tag(name = "Merchant Finance", description = "Merchant ledger and settlement view")
public class MerchantFinanceController {

    private final FinanceQueryService financeQueryService;
    private final CurrentUserService currentUserService;

    @GetMapping("/summary")
    @Operation(summary = "Finance summary for date range and optional status")
    public ResponseEntity<FinanceSummaryDTO> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) LedgerStatus status,
            @AuthenticationPrincipal JwtPrincipal principal) {
        var merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        return ResponseEntity.ok(financeQueryService.getMerchantSummary(merchantId, status, from, to, principal));
    }

    @GetMapping("/ledgers")
    @Operation(summary = "Paginated ledger list with filters")
    public ResponseEntity<Page<PayoutLedgerDTO>> getLedgers(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) LedgerStatus status,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal JwtPrincipal principal) {
        var merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        return ResponseEntity.ok(financeQueryService.getLedgersForMerchant(merchantId, status, from, to, pageable, principal));
    }
}
