package com.homeservices.controller;

import com.homeservices.dto.AuditEventResponse;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.AuditEventQueryService;
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
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

@RestController
@RequestMapping("/api/admin/audit")
@RequiredArgsConstructor
@Tag(name = "Admin Audit", description = "Admin audit log endpoints")
public class AdminAuditController {

    private final AuditEventQueryService auditEventQueryService;

    @GetMapping("/events")
    @Operation(summary = "List audit events with filters")
    public ResponseEntity<Page<AuditEventResponse>> listEvents(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String actorRole,
            @RequestParam(required = false) String actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) String requestId,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        Instant fromInstant = from != null ? from.atStartOfDay(ZoneOffset.UTC).toInstant() : LocalDate.now().minusDays(7).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toInstant = to != null ? to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant() : Instant.now();
        return ResponseEntity.ok(auditEventQueryService.findFiltered(
            fromInstant, toInstant, actorRole, actorId, action, entityType, entityId, requestId, keyword, pageable));
    }

    @GetMapping("/events/{id}")
    @Operation(summary = "Get audit event by ID")
    public ResponseEntity<AuditEventResponse> getEvent(@PathVariable Long id,
                                                        @AuthenticationPrincipal JwtPrincipal principal) {
        return auditEventQueryService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/requests/{requestId}")
    @Operation(summary = "Get all events for a request ID (trace)")
    public ResponseEntity<List<AuditEventResponse>> getByRequestId(@PathVariable String requestId,
                                                                    @AuthenticationPrincipal JwtPrincipal principal) {
        return ResponseEntity.ok(auditEventQueryService.findByRequestId(requestId));
    }
}
