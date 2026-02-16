package com.homeservices.controller;

import com.homeservices.domain.ComplaintCategory;
import com.homeservices.domain.ComplaintStatus;
import com.homeservices.dto.ComplaintTicketDTO;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.ComplaintService;
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
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Tag(name = "User Complaints", description = "Create and view complaints for own orders")
public class UserComplaintController {

    private final ComplaintService complaintService;

    @PostMapping("/orders/{orderId}/complaints")
    @Operation(summary = "Create a complaint for an order (multipart: subject, category, description, optional files)")
    public ResponseEntity<ComplaintTicketDTO> create(
            @PathVariable UUID orderId,
            @RequestParam("subject") String subject,
            @RequestParam("category") ComplaintCategory category,
            @RequestParam("description") String description,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @AuthenticationPrincipal JwtPrincipal principal) {
        List<MultipartFile> fileList = files != null ? files : new ArrayList<>();
        ComplaintTicketDTO dto = complaintService.create(orderId, principal.id(), subject, category, description, fileList, principal);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/complaints")
    @Operation(summary = "List my complaints with optional filters")
    public ResponseEntity<Page<ComplaintTicketDTO>> list(
            @RequestParam(required = false) ComplaintStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(complaintService.listForUser(principal.id(), status, from, to, pageable, principal));
    }

    @GetMapping("/complaints/{id}")
    @Operation(summary = "Get complaint by ID (own only)")
    public ResponseEntity<ComplaintTicketDTO> get(@PathVariable Long id,
                                                   @AuthenticationPrincipal JwtPrincipal principal) {
        return complaintService.getForUser(id, principal.id(), principal)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/complaints/{id}/close")
    @Operation(summary = "Withdraw complaint (OPEN or IN_REVIEW -> CLOSED)")
    public ResponseEntity<ComplaintTicketDTO> close(@PathVariable Long id,
                                                    @AuthenticationPrincipal JwtPrincipal principal) {
        return complaintService.closeByUser(id, principal.id(), principal)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
