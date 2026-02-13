package com.homeservices.service;

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

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        long start = System.currentTimeMillis();
        UserAccount account = userAccountRepository.findByEmail(request.getEmail().trim())
            .orElseGet(() -> {
                AuditLogging.logAuth("UNKNOWN", request.getEmail(), "LOGIN", false);
                return null;
            });
        if (account == null || !passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            AuditLogging.logAuth("UNKNOWN", request.getEmail(), "LOGIN", false);
            return null;
        }
        if (account.getStatus() != com.homeservices.domain.AccountStatus.ACTIVE) {
            AuditLogging.logAuth(account.getRole().name(), account.getId().toString(), "LOGIN_INACTIVE", false);
            return null;
        }
        String accessToken = jwtService.createAccessToken(account);
        String refreshToken = jwtService.createRefreshToken(account.getId());
        long duration = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("AUTH", "LOGIN", account.getId().toString(),
            account.getRole().name(), account.getId().toString(), duration);
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
}
