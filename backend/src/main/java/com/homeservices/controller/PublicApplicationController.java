package com.homeservices.controller;

import com.homeservices.dto.MerchantApplicationCreateRequest;
import com.homeservices.dto.MerchantApplicationDTO;
import com.homeservices.dto.WorkerApplicationCreateRequest;
import com.homeservices.dto.WorkerApplicationDTO;
import com.homeservices.service.MerchantApplicationService;
import com.homeservices.service.WorkerApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Tag(name = "Public Applications", description = "Submit worker/merchant applications (no auth)")
public class PublicApplicationController {

    private final WorkerApplicationService workerApplicationService;
    private final MerchantApplicationService merchantApplicationService;

    @PostMapping("/worker-applications")
    @Operation(summary = "Submit worker application")
    public ResponseEntity<WorkerApplicationDTO> submitWorker(@Valid @RequestBody WorkerApplicationCreateRequest request) {
        return ResponseEntity.ok(workerApplicationService.submit(request));
    }

    @PostMapping("/merchant-applications")
    @Operation(summary = "Submit merchant application")
    public ResponseEntity<MerchantApplicationDTO> submitMerchant(@Valid @RequestBody MerchantApplicationCreateRequest request) {
        return ResponseEntity.ok(merchantApplicationService.submit(request));
    }
}
