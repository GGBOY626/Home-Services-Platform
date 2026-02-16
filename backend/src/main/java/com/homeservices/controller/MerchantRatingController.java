package com.homeservices.controller;

import com.homeservices.dto.RatingDTO;
import com.homeservices.dto.RatingSummaryDTO;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.CurrentUserService;
import com.homeservices.service.RatingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping("/api/merchant/ratings")
@RequiredArgsConstructor
@Tag(name = "Merchant Ratings", description = "View ratings for merchant orders and summary")
public class MerchantRatingController {

    private final RatingService ratingService;
    private final CurrentUserService currentUserService;

    @GetMapping
    @Operation(summary = "List ratings for my merchant")
    public ResponseEntity<Page<RatingDTO>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        return ResponseEntity.ok(ratingService.listForMerchant(merchantId, from, to, pageable, principal));
    }

    @GetMapping("/summary")
    @Operation(summary = "Get rating summary for my merchant")
    public ResponseEntity<RatingSummaryDTO> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        return ResponseEntity.ok(ratingService.summaryForMerchant(merchantId, from, to, principal));
    }
}
