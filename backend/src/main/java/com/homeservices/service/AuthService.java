package com.homeservices.service;

import com.homeservices.config.AuditActions;
import com.homeservices.config.AuditLogging;
import com.homeservices.domain.UserAccount;
import com.homeservices.dto.AuthResponse;
import com.homeservices.dto.LoginRequest;
import com.homeservices.repository.UserAccountRepository;
import com.homeservices.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditEventService auditEventService;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        long start = System.currentTimeMillis();
        UserAccount account = userAccountRepository.findByEmail(request.getEmail().trim())
            .orElseGet(() -> {
                AuditLogging.logAuth("UNKNOWN", request.getEmail(), "LOGIN", false);
                auditEventService.recordWithContext("UNKNOWN", null, AuditActions.AUTH_LOGIN_FAILURE, "AUTH", null,
                    "Login failed: user not found (email)", null, (int) (System.currentTimeMillis() - start));
                return null;
            });
        if (account == null || !passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            AuditLogging.logAuth("UNKNOWN", request.getEmail(), "LOGIN", false);
            auditEventService.recordWithContext("UNKNOWN", null, AuditActions.AUTH_LOGIN_FAILURE, "AUTH", null,
                "Login failed: invalid credentials", null, (int) (System.currentTimeMillis() - start));
            return null;
        }
        if (account.getStatus() != com.homeservices.domain.AccountStatus.ACTIVE) {
            AuditLogging.logAuth(account.getRole().name(), account.getId().toString(), "LOGIN_INACTIVE", false);
            auditEventService.recordWithContext(account.getRole().name(), account.getId().toString(), AuditActions.AUTH_LOGIN_FAILURE, "AUTH", account.getId().toString(),
                "Login failed: account inactive", null, (int) (System.currentTimeMillis() - start));
            return null;
        }
        String accessToken = jwtService.createAccessToken(account);
        String refreshToken = jwtService.createRefreshToken(account.getId());
        long duration = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("AUTH", "LOGIN", account.getId().toString(),
            account.getRole().name(), account.getId().toString(), duration);
        auditEventService.recordWithContext(account.getRole().name(), account.getId().toString(), AuditActions.AUTH_LOGIN_SUCCESS, "AUTH", account.getId().toString(),
            "Login success", null, (int) duration);
        return AuthResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .tokenType("Bearer")
            .expiresInSeconds(jwtService.getAccessTokenValiditySeconds())
            .role(account.getRole().name())
            .build();
    }

    @Transactional
    public AuthResponse refresh(String refreshToken) {
        return jwtService.validateRefreshToken(refreshToken)
            .flatMap(accountId -> userAccountRepository.findById(accountId))
            .filter(account -> account.getStatus() == com.homeservices.domain.AccountStatus.ACTIVE)
            .map(account -> {
                jwtService.revokeRefreshToken(refreshToken);
                String access = jwtService.createAccessToken(account);
                String refresh = jwtService.createRefreshToken(account.getId());
                return AuthResponse.builder()
                    .accessToken(access)
                    .refreshToken(refresh)
                    .tokenType("Bearer")
                    .expiresInSeconds(jwtService.getAccessTokenValiditySeconds())
                    .role(account.getRole().name())
                    .build();
            })
            .orElse(null);
    }

    @Transactional
    public void changePassword(UUID accountId, String currentPassword, String newPassword) {
        UserAccount account = userAccountRepository.findById(accountId)
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (!passwordEncoder.matches(currentPassword, account.getPasswordHash())) {
            auditEventService.recordWithContext(account.getRole().name(), account.getId().toString(),
                AuditActions.AUTH_LOGIN_FAILURE, "AUTH", account.getId().toString(),
                "Password change failed: incorrect current password", null, 0);
            throw new IllegalArgumentException("Current password is incorrect");
        }
        account.setPasswordHash(passwordEncoder.encode(newPassword));
        userAccountRepository.save(account);
        auditEventService.recordWithContext(account.getRole().name(), account.getId().toString(),
            AuditActions.PASSWORD_CHANGED, "AUTH", account.getId().toString(),
            "Password changed successfully", null, 0);
    }
}
