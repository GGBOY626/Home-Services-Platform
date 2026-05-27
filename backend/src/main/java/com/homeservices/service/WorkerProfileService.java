package com.homeservices.service;

import com.homeservices.config.AuditActions;
import com.homeservices.config.AuditLogging;
import com.homeservices.domain.WorkerAvailability;
import com.homeservices.domain.WorkerProfile;
import com.homeservices.dto.WorkerMeResponse;
import com.homeservices.repository.WorkerProfileRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkerProfileService {

    private final WorkerProfileRepository workerProfileRepository;
    private final CurrentUserService currentUserService;
    private final AuditEventService auditEventService;

    public WorkerMeResponse getMe(JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        WorkerProfile profile = currentUserService.getWorkerProfile(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        AuditLogging.logWithActor("READ", "WorkerProfile", "id=" + profile.getId() + ",availability=" + profile.getAvailability().name(),
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return toMeResponse(profile);
    }

    @Transactional
    public WorkerMeResponse setAvailability(String availabilityStr, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        WorkerProfile profile = currentUserService.getWorkerProfile(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        WorkerAvailability availability = WorkerAvailability.valueOf(availabilityStr);
        profile.setAvailability(availability);
        if (availability == WorkerAvailability.ONLINE) {
            profile.setLastSeenAt(Instant.now());
        }
        profile.setUpdatedAt(Instant.now());
        profile = workerProfileRepository.save(profile);
        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("UPDATE", "WorkerProfile", "id=" + profile.getId() + ",availability=" + availability,
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.WORKER_AVAILABILITY_CHANGE, "WORKER", profile.getId().toString(),
            "Worker availability changed", java.util.Map.of("availability", availability.name()), (int) dur);
        return toMeResponse(profile);
    }

    @Transactional
    public WorkerMeResponse setLocation(String homeAddress, Double homeLat, Double homeLng, JwtPrincipal principal) {
        WorkerProfile profile = currentUserService.getWorkerProfile(principal)
            .orElseThrow(() -> new IllegalStateException("Worker profile not found"));
        profile.setHomeAddress(homeAddress);
        profile.setHomeLat(homeLat);
        profile.setHomeLng(homeLng);
        profile.setUpdatedAt(Instant.now());
        profile = workerProfileRepository.save(profile);
        return toMeResponse(profile);
    }

    private static WorkerMeResponse toMeResponse(WorkerProfile p) {
        return WorkerMeResponse.builder()
            .id(p.getId())
            .accountId(p.getAccountId())
            .displayName(p.getDisplayName())
            .availability(p.getAvailability().name())
            .lastSeenAt(p.getLastSeenAt())
            .homeAddress(p.getHomeAddress())
            .homeLat(p.getHomeLat())
            .homeLng(p.getHomeLng())
            .build();
    }
}
