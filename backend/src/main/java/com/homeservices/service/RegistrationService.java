package com.homeservices.service;

import com.homeservices.config.AuditActions;
import com.homeservices.domain.AccountStatus;
import com.homeservices.domain.Role;
import com.homeservices.domain.UserAccount;
import com.homeservices.dto.AuthResponse;
import com.homeservices.dto.RegisterRequest;
import com.homeservices.repository.UserAccountRepository;
import com.homeservices.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditEventService auditEventService;

    @Transactional
    public AuthResponse registerUser(RegisterRequest request) {
        if (userAccountRepository.existsByEmail(request.getEmail().trim())) {
            throw new IllegalArgumentException("Email already registered");
        }
        UserAccount account = UserAccount.builder()
            .email(request.getEmail().trim().toLowerCase())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .role(Role.USER)
            .status(AccountStatus.ACTIVE)
            .homeAddress(request.getHomeAddress())
            .homeLat(request.getHomeLat())
            .homeLng(request.getHomeLng())
            .build();
        account = userAccountRepository.save(account);
        String accessToken = jwtService.createAccessToken(account);
        String refreshToken = jwtService.createRefreshToken(account.getId());
        auditEventService.recordWithContext(Role.USER.name(), account.getId().toString(), AuditActions.AUTH_REGISTER_USER, "AUTH", account.getId().toString(),
            "User self-registered", null, null);
        return AuthResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .tokenType("Bearer")
            .expiresInSeconds(jwtService.getAccessTokenValiditySeconds())
            .role(account.getRole().name())
            .build();
    }
}
