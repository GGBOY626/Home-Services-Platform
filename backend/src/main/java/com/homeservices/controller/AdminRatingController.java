package com.homeservices.controller;

import com.homeservices.dto.RatingDTO;
import com.homeservices.dto.RatingSummaryDTO;
import com.homeservices.security.JwtPrincipal;
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
@RequestMapping("/api/admin/ratings")
@RequiredArgsConstructor
@Tag(name = "Admin Ratings", description = "View all ratings and platform summary")
public class AdminRatingController {

    private final RatingService ratingService;

    @GetMapping
    @Operation(summary = "List all ratings with optional filters")
    public ResponseEntity<Page<RatingDTO>> list(
            @RequestParam(required = false) UUID merchantId,
            @RequestParam(required = false) UUID workerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(ratingService.listForAdmin(merchantId, workerId, from, to, pageable, principal));
    }

    @GetMapping("/summary")
    @Operation(summary = "Get platform-level rating summary")
    public ResponseEntity<RatingSummaryDTO> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(ratingService.summaryForAdmin(from, to, principal));
    }
}
