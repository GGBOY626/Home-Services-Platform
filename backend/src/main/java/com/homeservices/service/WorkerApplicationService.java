package com.homeservices.service;

import com.homeservices.config.AuditActions;
import com.homeservices.domain.ApplicationStatus;
import com.homeservices.domain.WorkerApplication;
import com.homeservices.dto.*;
import com.homeservices.repository.MerchantProfileRepository;
import com.homeservices.repository.UserAccountRepository;
import com.homeservices.repository.WorkerApplicationRepository;
import com.homeservices.domain.UserAccount;
import com.homeservices.domain.WorkerAvailability;
import com.homeservices.repository.WorkerProfileRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkerApplicationService {

    private static final String TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final int TEMP_PASSWORD_LENGTH = 12;

    private final WorkerApplicationRepository applicationRepository;
    private final UserAccountRepository userAccountRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final MerchantProfileRepository merchantProfileRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final AuditEventService auditEventService;
    private final EmailService emailService;
    private final EmailTemplateService emailTemplateService;

    @Transactional
    public WorkerApplicationDTO submit(WorkerApplicationCreateRequest request) {
        if (userAccountRepository.existsByEmail(request.getEmail().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        if (applicationRepository.findByEmail(request.getEmail().trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An application with this email already exists");
        }
        WorkerApplication app = WorkerApplication.builder()
            .email(request.getEmail().trim().toLowerCase())
            .fullName(request.getFullName().trim())
            .phone(trim(request.getPhone(), 40))
            .city(trim(request.getCity(), 80))
            .notes(trim(request.getNotes(), 2000))
            .status(ApplicationStatus.PENDING)
            .build();
        app = applicationRepository.save(app);
        auditEventService.recordWithContext("PUBLIC", null, AuditActions.APPLICATION_CREATE_WORKER, "WORKER_APPLICATION", app.getId().toString(),
            "Worker application submitted", java.util.Map.of("email", app.getEmail(), "fullName", app.getFullName()), null);
        return toDTO(app);
    }

    @Transactional(readOnly = true)
    public Page<WorkerApplicationDTO> listForAdmin(ApplicationStatus status, Pageable pageable, JwtPrincipal principal) {
        if (status != null) {
            return applicationRepository.findByStatusOrderByCreatedAtDesc(status, pageable).map(this::toDTO);
        }
        return applicationRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public WorkerApplicationDTO getById(Long id, JwtPrincipal principal) {
        return applicationRepository.findById(id).map(this::toDTO)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
    }

    @Transactional
    public ApproveResponse approve(Long id, ApproveWorkerRequest request, JwtPrincipal principal) {
        WorkerApplication app = applicationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        if (app.getStatus() != ApplicationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Application already decided");
        }
        if (userAccountRepository.existsByEmail(app.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        if (!merchantProfileRepository.existsById(request.getMerchantId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Merchant not found");
        }
        String tempPassword = generateTempPassword();
        UserAccount account = UserAccount.builder()
            .email(app.getEmail())
            .passwordHash(passwordEncoder.encode(tempPassword))
            .role(com.homeservices.domain.Role.WORKER)
            .status(com.homeservices.domain.AccountStatus.ACTIVE)
            .build();
        account = userAccountRepository.save(account);
        var profile = com.homeservices.domain.WorkerProfile.builder()
            .accountId(account.getId())
            .displayName(app.getFullName())
            .merchantId(request.getMerchantId())
            .availability(WorkerAvailability.OFFLINE)
            .updatedAt(Instant.now())
            .build();
        workerProfileRepository.save(profile);
        app.setStatus(ApplicationStatus.APPROVED);
        app.setAdminNote(trim(request.getAdminNote(), 1000));
        app.setDecidedAt(Instant.now());
        applicationRepository.save(app);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.APPLICATION_APPROVE, "WORKER_APPLICATION", app.getId().toString(),
            "Worker application approved", java.util.Map.of("applicationId", id, "accountId", account.getId().toString(), "merchantId", request.getMerchantId().toString()), null);

        // Send approval email with temporary credentials
        try {
            String subject = "Your Worker Application Has Been Approved!";
            String htmlBody = emailTemplateService.buildWorkerApplicationApprovedEmail(app.getFullName(), tempPassword);
            emailService.sendEmail(subject, htmlBody);
        } catch (Exception e) {
            log.warn("Failed to send worker application approval email for {}: {}", app.getEmail(), e.getMessage());
        }

        return ApproveResponse.builder()
            .application(toDTO(app))
            .tempPassword(tempPassword)
            .build();
    }

    @Transactional
    public WorkerApplicationDTO reject(Long id, ApproveRejectRequest request, JwtPrincipal principal) {
        WorkerApplication app = applicationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        if (app.getStatus() != ApplicationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Application already decided");
        }
        app.setStatus(ApplicationStatus.REJECTED);
        app.setAdminNote(trim(request.getAdminNote(), 1000));
        app.setDecidedAt(Instant.now());
        applicationRepository.save(app);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.APPLICATION_REJECT, "WORKER_APPLICATION", app.getId().toString(),
            "Worker application rejected", java.util.Map.of("applicationId", id), null);
        return toDTO(app);
    }

    private static String generateTempPassword() {
        SecureRandom r = new SecureRandom();
        StringBuilder sb = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
            sb.append(TEMP_PASSWORD_CHARS.charAt(r.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }

    private static String trim(String s, int max) {
        if (s == null) return null;
        s = s.trim();
        return s.isEmpty() ? null : (s.length() > max ? s.substring(0, max) : s);
    }

    private WorkerApplicationDTO toDTO(WorkerApplication app) {
        return WorkerApplicationDTO.builder()
            .id(app.getId())
            .email(app.getEmail())
            .fullName(app.getFullName())
            .phone(app.getPhone())
            .city(app.getCity())
            .notes(app.getNotes())
            .status(app.getStatus())
            .adminNote(app.getAdminNote())
            .decidedAt(app.getDecidedAt())
            .createdAt(app.getCreatedAt())
            .updatedAt(app.getUpdatedAt())
            .build();
    }
}
