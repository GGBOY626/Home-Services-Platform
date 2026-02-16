package com.homeservices.controller;

import com.homeservices.domain.ApplicationStatus;
import com.homeservices.dto.*;
import com.homeservices.repository.MerchantProfileRepository;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.MerchantApplicationService;
import com.homeservices.service.WorkerApplicationService;
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

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/applications")
@RequiredArgsConstructor
@Tag(name = "Admin Applications", description = "Review and approve/reject worker and merchant applications")
public class AdminApplicationController {

    private final WorkerApplicationService workerApplicationService;
    private final MerchantApplicationService merchantApplicationService;
    private final MerchantProfileRepository merchantProfileRepository;

    @GetMapping("/merchants/list")
    @Operation(summary = "List merchants (for worker approval dropdown)")
    public ResponseEntity<List<MerchantSummaryDTO>> merchantsList(@AuthenticationPrincipal JwtPrincipal principal) {
        List<MerchantSummaryDTO> list = merchantProfileRepository.findAll().stream()
            .map(m -> new MerchantSummaryDTO(m.getId().toString(), m.getDisplayName()))
            .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/workers")
    @Operation(summary = "List worker applications")
    public ResponseEntity<Page<WorkerApplicationDTO>> listWorkers(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestParam(required = false) ApplicationStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(workerApplicationService.listForAdmin(status, pageable, principal));
    }

    @GetMapping("/workers/{id}")
    @Operation(summary = "Get worker application by ID")
    public ResponseEntity<WorkerApplicationDTO> getWorker(@PathVariable Long id, @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(workerApplicationService.getById(id, principal));
    }

    @PostMapping("/workers/{id}/approve")
    @Operation(summary = "Approve worker application (creates account + profile, returns temp password)")
    public ResponseEntity<ApproveResponse> approveWorker(@PathVariable Long id,
                                                          @Valid @RequestBody ApproveWorkerRequest request,
                                                          @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(workerApplicationService.approve(id, request, principal));
    }

    @PostMapping("/workers/{id}/reject")
    @Operation(summary = "Reject worker application")
    public ResponseEntity<WorkerApplicationDTO> rejectWorker(@PathVariable Long id,
                                                              @RequestBody(required = false) ApproveRejectRequest request,
                                                              @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(workerApplicationService.reject(id, request != null ? request : new ApproveRejectRequest(), principal));
    }

    @GetMapping("/merchants")
    @Operation(summary = "List merchant applications")
    public ResponseEntity<Page<MerchantApplicationDTO>> listMerchants(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestParam(required = false) ApplicationStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(merchantApplicationService.listForAdmin(status, pageable, principal));
    }

    @GetMapping("/merchants/{id}")
    @Operation(summary = "Get merchant application by ID")
    public ResponseEntity<MerchantApplicationDTO> getMerchant(@PathVariable Long id, @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(merchantApplicationService.getById(id, principal));
    }

    @PostMapping("/merchants/{id}/approve")
    @Operation(summary = "Approve merchant application (creates account + profile, returns temp password)")
    public ResponseEntity<ApproveResponse> approveMerchant(@PathVariable Long id,
                                                            @RequestBody(required = false) ApproveRejectRequest request,
                                                            @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(merchantApplicationService.approve(id, request != null ? request : new ApproveRejectRequest(), principal));
    }

    @PostMapping("/merchants/{id}/reject")
    @Operation(summary = "Reject merchant application")
    public ResponseEntity<MerchantApplicationDTO> rejectMerchant(@PathVariable Long id,
                                                                 @RequestBody(required = false) ApproveRejectRequest request,
                                                                 @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(merchantApplicationService.reject(id, request != null ? request : new ApproveRejectRequest(), principal));
    }
}
