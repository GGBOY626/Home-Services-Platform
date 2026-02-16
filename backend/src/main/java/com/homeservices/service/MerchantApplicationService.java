package com.homeservices.service;

import com.homeservices.config.AuditActions;
import com.homeservices.domain.ApplicationStatus;
import com.homeservices.domain.MerchantApplication;
import com.homeservices.domain.MerchantProfile;
import com.homeservices.domain.UserAccount;
import com.homeservices.dto.*;
import com.homeservices.repository.MerchantApplicationRepository;
import com.homeservices.repository.MerchantProfileRepository;
import com.homeservices.repository.UserAccountRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class MerchantApplicationService {

    private static final String TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final int TEMP_PASSWORD_LENGTH = 12;

    private final MerchantApplicationRepository applicationRepository;
    private final UserAccountRepository userAccountRepository;
    private final MerchantProfileRepository merchantProfileRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final AuditEventService auditEventService;

    @Transactional
    public MerchantApplicationDTO submit(MerchantApplicationCreateRequest request) {
        if (userAccountRepository.existsByEmail(request.getEmail().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        if (applicationRepository.findByEmail(request.getEmail().trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An application with this email already exists");
        }
        MerchantApplication app = MerchantApplication.builder()
            .email(request.getEmail().trim().toLowerCase())
            .businessName(request.getBusinessName().trim())
            .contactName(request.getContactName().trim())
            .phone(trim(request.getPhone(), 40))
            .address(trim(request.getAddress(), 255))
            .nzbnOrAbn(trim(request.getNzbnOrAbn(), 40))
            .gstRegistered(request.getGstRegistered())
            .notes(trim(request.getNotes(), 2000))
            .status(ApplicationStatus.PENDING)
            .build();
        app = applicationRepository.save(app);
        auditEventService.recordWithContext("PUBLIC", null, AuditActions.APPLICATION_CREATE_MERCHANT, "MERCHANT_APPLICATION", app.getId().toString(),
            "Merchant application submitted", java.util.Map.of("email", app.getEmail(), "businessName", app.getBusinessName()), null);
        return toDTO(app);
    }

    @Transactional(readOnly = true)
    public Page<MerchantApplicationDTO> listForAdmin(ApplicationStatus status, Pageable pageable, JwtPrincipal principal) {
        if (status != null) {
            return applicationRepository.findByStatusOrderByCreatedAtDesc(status, pageable).map(this::toDTO);
        }
        return applicationRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public MerchantApplicationDTO getById(Long id, JwtPrincipal principal) {
        return applicationRepository.findById(id).map(this::toDTO)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
    }

    @Transactional
    public ApproveResponse approve(Long id, ApproveRejectRequest request, JwtPrincipal principal) {
        MerchantApplication app = applicationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        if (app.getStatus() != ApplicationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Application already decided");
        }
        if (userAccountRepository.existsByEmail(app.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        String tempPassword = generateTempPassword();
        UserAccount account = UserAccount.builder()
            .email(app.getEmail())
            .passwordHash(passwordEncoder.encode(tempPassword))
            .role(com.homeservices.domain.Role.MERCHANT)
            .status(com.homeservices.domain.AccountStatus.ACTIVE)
            .build();
        account = userAccountRepository.save(account);
        MerchantProfile profile = MerchantProfile.builder()
            .accountId(account.getId())
            .displayName(app.getBusinessName())
            .build();
        merchantProfileRepository.save(profile);
        app.setStatus(ApplicationStatus.APPROVED);
        app.setAdminNote(trim(request.getAdminNote(), 1000));
        app.setDecidedAt(Instant.now());
        applicationRepository.save(app);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.APPLICATION_APPROVE, "MERCHANT_APPLICATION", app.getId().toString(),
            "Merchant application approved", java.util.Map.of("applicationId", id, "accountId", account.getId().toString()), null);
        return ApproveResponse.builder()
            .merchantApplication(toDTO(app))
            .tempPassword(tempPassword)
            .build();
    }

    @Transactional
    public MerchantApplicationDTO reject(Long id, ApproveRejectRequest request, JwtPrincipal principal) {
        MerchantApplication app = applicationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        if (app.getStatus() != ApplicationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Application already decided");
        }
        app.setStatus(ApplicationStatus.REJECTED);
        app.setAdminNote(trim(request.getAdminNote(), 1000));
        app.setDecidedAt(Instant.now());
        applicationRepository.save(app);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.APPLICATION_REJECT, "MERCHANT_APPLICATION", app.getId().toString(),
            "Merchant application rejected", java.util.Map.of("applicationId", id), null);
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

    private MerchantApplicationDTO toDTO(MerchantApplication app) {
        return MerchantApplicationDTO.builder()
            .id(app.getId())
            .email(app.getEmail())
            .businessName(app.getBusinessName())
            .contactName(app.getContactName())
            .phone(app.getPhone())
            .address(app.getAddress())
            .nzbnOrAbn(app.getNzbnOrAbn())
            .gstRegistered(app.getGstRegistered())
            .notes(app.getNotes())
            .status(app.getStatus())
            .adminNote(app.getAdminNote())
            .decidedAt(app.getDecidedAt())
            .createdAt(app.getCreatedAt())
            .updatedAt(app.getUpdatedAt())
            .build();
    }
}
