package com.homeservices.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.homeservices.domain.AuditEvent;
import com.homeservices.dto.AuditEventResponse;
import com.homeservices.repository.AuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuditEventQueryService {

    private final AuditEventRepository auditEventRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public Page<AuditEventResponse> findFiltered(Instant from, Instant to, String actorRole, String actorId,
                                                  String action, String entityType, String entityId,
                                                  String requestId, String keyword, Pageable pageable) {
        Sort sort = pageable.getSort().isSorted() ? pageable.getSort() : Sort.by(Sort.Direction.DESC, "createdAt");
        Pageable p = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        return auditEventRepository.findFiltered(from, to, actorRole, actorId, action, entityType, entityId, requestId, keyword, p)
            .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Optional<AuditEventResponse> findById(Long id) {
        return auditEventRepository.findById(id).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<AuditEventResponse> findByRequestId(String requestId) {
        return auditEventRepository.findByRequestIdOrderByCreatedAtAsc(requestId).stream()
            .map(this::toResponse)
            .toList();
    }

    private AuditEventResponse toResponse(AuditEvent e) {
        Map<String, Object> metadata = null;
        if (e.getMetadataJson() != null && !e.getMetadataJson().isBlank()) {
            try {
                metadata = objectMapper.readValue(e.getMetadataJson(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception ignored) {
                metadata = Map.of("raw", e.getMetadataJson());
            }
        }
        return AuditEventResponse.builder()
            .id(e.getId())
            .requestId(e.getRequestId())
            .actorRole(e.getActorRole())
            .actorId(e.getActorId())
            .action(e.getAction())
            .entityType(e.getEntityType())
            .entityId(e.getEntityId())
            .summary(e.getSummary())
            .metadata(metadata)
            .ipAddress(e.getIpAddress())
            .userAgent(e.getUserAgent())
            .durationMs(e.getDurationMs())
            .createdAt(e.getCreatedAt())
            .build();
    }
}
