package com.homeservices.controller;

import com.homeservices.dto.MerchantServiceOfferDTO;
import com.homeservices.dto.UpsertMerchantServiceRequest;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.CurrentUserService;
import com.homeservices.service.MerchantServiceOfferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/merchant")
@RequiredArgsConstructor
@Tag(name = "Merchant Services", description = "Merchant service offerings and pricing")
public class MerchantServiceController {

    private final MerchantServiceOfferService merchantServiceOfferService;
    private final CurrentUserService currentUserService;

    @GetMapping("/services")
    @Operation(summary = "List my service offerings (all items with override/active state)")
    public ResponseEntity<List<MerchantServiceOfferDTO>> listServices(@AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        return ResponseEntity.ok(merchantServiceOfferService.getOffersForMerchant(merchantId, principal));
    }

    @PutMapping("/services/{serviceItemId}")
    @Operation(summary = "Upsert merchant service (enable/disable and set price)")
    public ResponseEntity<MerchantServiceOfferDTO> upsertService(@PathVariable Long serviceItemId,
                                                                  @Valid @RequestBody UpsertMerchantServiceRequest request,
                                                                  @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        return ResponseEntity.ok(merchantServiceOfferService.upsertMerchantService(merchantId, serviceItemId, request, principal));
    }
}
