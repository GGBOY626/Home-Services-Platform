package com.homeservices.controller;

import com.homeservices.config.AuditLogging;
import com.homeservices.domain.AccountStatus;
import com.homeservices.domain.Role;
import com.homeservices.domain.UserAccount;
import com.homeservices.domain.WorkerAvailability;
import com.homeservices.domain.WorkerProfile;
import com.homeservices.domain.MerchantProfile;
import com.homeservices.dto.AssignWorkerRequest;
import com.homeservices.dto.CompletionProofDTO;
import com.homeservices.dto.CreateWorkerRequest;
import com.homeservices.dto.CreateWorkerResponse;
import com.homeservices.dto.MerchantMeResponse;
import com.homeservices.dto.OrderResponse;
import com.homeservices.dto.RejectRequest;
import com.homeservices.dto.UpdateLocationRequest;
import com.homeservices.dto.UpdateWorkerRequest;
import com.homeservices.dto.WorkerSummaryResponse;
import com.homeservices.repository.MerchantProfileRepository;
import com.homeservices.repository.UserAccountRepository;
import com.homeservices.repository.WorkerProfileRepository;
import com.homeservices.security.JwtPrincipal;
import com.homeservices.service.CurrentUserService;
import com.homeservices.service.EmailService;
import com.homeservices.service.EmailTemplateService;
import com.homeservices.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/merchant")
@RequiredArgsConstructor
@Tag(name = "Merchant", description = "Merchant endpoints")
public class MerchantOrderController {

    private final OrderService orderService;
    private final com.homeservices.service.CompletionProofService completionProofService;
    private final CurrentUserService currentUserService;
    private final WorkerProfileRepository workerProfileRepository;
    private final MerchantProfileRepository merchantProfileRepository;
    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final EmailTemplateService emailTemplateService;

    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private String generateTempPassword() {
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        return sb.toString();
    }

    @GetMapping("/me")
    @Operation(summary = "Get my merchant profile (includes business location)")
    public ResponseEntity<MerchantMeResponse> me(@AuthenticationPrincipal JwtPrincipal principal) {
        MerchantProfile profile = merchantProfileRepository.findByAccountId(principal.id())
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        return ResponseEntity.ok(toMeResponse(profile));
    }

    @PatchMapping("/me/location")
    @Operation(summary = "Set merchant business address and coordinates")
    public ResponseEntity<MerchantMeResponse> setLocation(
            @Valid @RequestBody UpdateLocationRequest request,
            @AuthenticationPrincipal JwtPrincipal principal) {
        MerchantProfile profile = merchantProfileRepository.findByAccountId(principal.id())
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        profile.setBusinessAddress(request.getAddress());
        profile.setBusinessLat(request.getLat());
        profile.setBusinessLng(request.getLng());
        merchantProfileRepository.save(profile);
        return ResponseEntity.ok(toMeResponse(profile));
    }

    private static MerchantMeResponse toMeResponse(MerchantProfile p) {
        return MerchantMeResponse.builder()
            .id(p.getId())
            .accountId(p.getAccountId())
            .displayName(p.getDisplayName())
            .businessAddress(p.getBusinessAddress())
            .businessLat(p.getBusinessLat())
            .businessLng(p.getBusinessLng())
            .build();
    }

    @GetMapping("/orders")
    @Operation(summary = "List orders assigned to my merchant")
    public ResponseEntity<Page<OrderResponse>> listOrders(@AuthenticationPrincipal JwtPrincipal principal,
                                                           @PageableDefault(size = 20) Pageable pageable) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        return ResponseEntity.ok(orderService.findByMerchantId(merchantId, pageable, principal));
    }

    @GetMapping("/orders/{id}/completion-proof")
    @Operation(summary = "Get completion proof for order (Merchant: assigned orders only)")
    public ResponseEntity<CompletionProofDTO> getCompletionProof(@PathVariable UUID id,
                                                                  @AuthenticationPrincipal JwtPrincipal principal) {
        OrderResponse order = orderService.getById(id, principal);
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        if (order.getMerchantId() == null || !order.getMerchantId().equals(merchantId)) {
            return ResponseEntity.notFound().build();
        }
        return completionProofService.getProofForOrder(id, principal)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/orders/{id}")
    @Operation(summary = "Get order by ID (must belong to my merchant)")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID id,
                                                   @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        OrderResponse order = orderService.getById(id, principal);
        if (order.getMerchantId() == null || !order.getMerchantId().equals(merchantId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(order);
    }

    @GetMapping("/workers")
    @Operation(summary = "List my workers (optional filter: availability=ONLINE)")
    public ResponseEntity<List<WorkerSummaryResponse>> listWorkers(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestParam(required = false) String availability) {
        long start = System.currentTimeMillis();
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        List<WorkerProfile> workers;
        if ("ONLINE".equalsIgnoreCase(availability)) {
            workers = workerProfileRepository.findByMerchantIdAndAvailability(merchantId, WorkerAvailability.ONLINE);
        } else {
            workers = workerProfileRepository.findByMerchantId(merchantId);
        }
        List<WorkerSummaryResponse> list = workers.stream()
            .map(this::toWorkerSummary)
            .collect(Collectors.toList());
        AuditLogging.logWithActor("READ", "WorkerProfile", "merchantId=" + merchantId + ",availability=" + availability,
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return ResponseEntity.ok(list);
    }

    private WorkerSummaryResponse toWorkerSummary(WorkerProfile w) {
        return WorkerSummaryResponse.builder()
            .id(w.getId())
            .accountId(w.getAccountId())
            .displayName(w.getDisplayName())
            .availability(w.getAvailability().name())
            .lastSeenAt(w.getLastSeenAt())
            .homeLat(w.getHomeLat())
            .homeLng(w.getHomeLng())
            .build();
    }

    @PostMapping("/orders/{id}/assign-worker")
    @Operation(summary = "Assign a worker to an order")
    public ResponseEntity<OrderResponse> assignWorker(@PathVariable UUID id,
                                                       @Valid @RequestBody AssignWorkerRequest request,
                                                       @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        OrderResponse response = orderService.assignWorker(id, request.getWorkerId(), merchantId, principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/orders/{id}/reject")
    @Operation(summary = "Reject order (return to PLACED, clear merchant and worker)")
    public ResponseEntity<OrderResponse> reject(@PathVariable UUID id,
                                                 @RequestBody(required = false) RejectRequest request,
                                                 @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        OrderResponse response = orderService.rejectByMerchant(id, request != null ? request.getReason() : null, merchantId, principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/workers")
    @Operation(summary = "Create a new worker account directly under this merchant")
    public ResponseEntity<CreateWorkerResponse> createWorker(
            @Valid @RequestBody CreateWorkerRequest request,
            @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        if (userAccountRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        String tempPassword = generateTempPassword();
        UserAccount account = UserAccount.builder()
            .email(request.getEmail())
            .passwordHash(passwordEncoder.encode(tempPassword))
            .role(Role.WORKER)
            .status(AccountStatus.ACTIVE)
            .build();
        account = userAccountRepository.save(account);
        WorkerProfile profile = WorkerProfile.builder()
            .accountId(account.getId())
            .displayName(request.getDisplayName())
            .merchantId(merchantId)
            .availability(WorkerAvailability.ONLINE)
            .updatedAt(Instant.now())
            .build();
        workerProfileRepository.save(profile);

        // Send welcome email with temporary password and worker login link
        try {
            String subject = "Your Worker Account Has Been Created!";
            String htmlBody = emailTemplateService.buildWorkerCreatedEmail(request.getDisplayName(), tempPassword);
            emailService.sendEmail(subject, htmlBody);
        } catch (Exception e) {
            // Email failure should not block worker creation
        }

        return ResponseEntity.ok(CreateWorkerResponse.builder()
            .worker(toWorkerSummary(profile))
            .tempPassword(tempPassword)
            .build());
    }

    @PatchMapping("/workers/{id}")
    @Operation(summary = "Update worker display name")
    public ResponseEntity<WorkerSummaryResponse> updateWorker(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateWorkerRequest request,
            @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        WorkerProfile profile = workerProfileRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Worker not found"));
        if (!merchantId.equals(profile.getMerchantId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your worker");
        }
        profile.setDisplayName(request.getDisplayName());
        workerProfileRepository.save(profile);
        return ResponseEntity.ok(toWorkerSummary(profile));
    }

    @DeleteMapping("/workers/{id}")
    @Operation(summary = "Delete a worker account (must belong to this merchant)")
    public ResponseEntity<Void> deleteWorker(
            @PathVariable UUID id,
            @AuthenticationPrincipal JwtPrincipal principal) {
        UUID merchantId = currentUserService.getMerchantId(principal)
            .orElseThrow(() -> new IllegalStateException("Merchant profile not found"));
        WorkerProfile profile = workerProfileRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Worker not found"));
        if (!merchantId.equals(profile.getMerchantId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your worker");
        }
        workerProfileRepository.delete(profile);
        userAccountRepository.deleteById(profile.getAccountId());
        return ResponseEntity.noContent().build();
    }
}
