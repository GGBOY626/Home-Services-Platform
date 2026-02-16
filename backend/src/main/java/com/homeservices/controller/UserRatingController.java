package com.homeservices.controller;

import com.homeservices.dto.CreateRatingRequest;
import com.homeservices.dto.RatingDTO;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.RatingService;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Tag(name = "User Ratings", description = "Rate closed orders and view own ratings")
public class UserRatingController {

    private final RatingService ratingService;

    @PostMapping("/orders/{orderId}/rating")
    @Operation(summary = "Submit rating for a closed order (1-5 stars, optional comment)")
    public ResponseEntity<RatingDTO> create(@PathVariable UUID orderId,
                                            @Valid @RequestBody CreateRatingRequest request,
                                            @AuthenticationPrincipal JwtPrincipal principal) {
        RatingDTO dto = ratingService.createRating(
            orderId, principal.id(),
            request.getStars(),
            request.getComment(),
            principal
        );
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/orders/{orderId}/rating")
    @Operation(summary = "Get rating for order (own orders only)")
    public ResponseEntity<RatingDTO> getByOrder(@PathVariable UUID orderId,
                                                 @AuthenticationPrincipal JwtPrincipal principal) {
        return ratingService.getRatingByOrder(orderId, principal.id(), principal)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/ratings")
    @Operation(summary = "List my ratings")
    public ResponseEntity<Page<RatingDTO>> list(@PageableDefault(size = 20) Pageable pageable,
                                                 @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(ratingService.listForUser(principal.id(), pageable, principal));
    }
}
