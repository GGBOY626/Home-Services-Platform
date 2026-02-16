package com.homeservices.controller;

import com.homeservices.domain.ComplaintCategory;
import com.homeservices.domain.ComplaintStatus;
import com.homeservices.dto.ComplaintTicketDTO;
import com.homeservices.dto.UpdateComplaintStatusRequest;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.ComplaintService;
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
@RequestMapping("/api/admin/complaints")
@RequiredArgsConstructor
@Tag(name = "Admin Complaints", description = "List all complaints, update status with optional note")
public class AdminComplaintController {

    private final ComplaintService complaintService;

    @GetMapping
    @Operation(summary = "List all complaints with filters")
    public ResponseEntity<Page<ComplaintTicketDTO>> list(
            @RequestParam(required = false) ComplaintStatus status,
            @RequestParam(required = false) ComplaintCategory category,
            @RequestParam(required = false) UUID merchantId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(complaintService.listForAdmin(status, category, merchantId, from, to, pageable, principal));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get complaint by ID")
    public ResponseEntity<ComplaintTicketDTO> get(@PathVariable Long id,
                                                   @AuthenticationPrincipal JwtPrincipal principal) {
        return complaintService.getForAdmin(id, principal)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/status")
    @Operation(summary = "Update complaint status (enforced transitions); optional note appended as message")
    public ResponseEntity<ComplaintTicketDTO> updateStatus(@PathVariable Long id,
                                                           @Valid @RequestBody UpdateComplaintStatusRequest request,
                                                           @AuthenticationPrincipal JwtPrincipal principal) {
        ComplaintTicketDTO dto = complaintService.updateStatusByAdmin(id, request.getStatus(), request.getNote(), principal);
        return ResponseEntity.ok(dto);
    }
}
