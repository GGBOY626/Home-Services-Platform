package com.homeservices.security;

import com.homeservices.domain.RefreshToken;
import com.homeservices.domain.Role;
import com.homeservices.domain.UserAccount;
import com.homeservices.repository.RefreshTokenRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final JwtProperties props;
    private final RefreshTokenRepository refreshTokenRepository;

    private SecretKey signingKey() {
        byte[] keyBytes = props.getSecret().getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String createAccessToken(UserAccount account) {
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(props.getAccessTokenValidityMs());
        return Jwts.builder()
            .subject(account.getId().toString())
            .claim("email", account.getEmail())
            .claim("role", account.getRole().name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(signingKey())
            .compact();
    }

    public String createRefreshToken(UUID accountId) {
        String token = UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plusSeconds(props.getRefreshTokenValidityDays() * 86400L);
        RefreshToken rt = RefreshToken.builder()
            .accountId(accountId)
            .token(token)
            .expiresAt(expiresAt)
            .build();
        refreshTokenRepository.save(rt);
        return token;
    }

    public Optional<JwtPrincipal> parseAccessToken(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
            UUID id = UUID.fromString(claims.getSubject());
            String email = claims.get("email", String.class);
            Role role = Role.valueOf(claims.get("role", String.class));
            return Optional.of(new JwtPrincipal(id, email, role));
        } catch (Exception e) {
            log.debug("Invalid access token: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<UUID> validateRefreshToken(String token) {
        return refreshTokenRepository.findByToken(token)
            .filter(rt -> rt.getExpiresAt().isAfter(Instant.now()))
            .map(RefreshToken::getAccountId);
    }

    public void revokeRefreshToken(String token) {
        refreshTokenRepository.findByToken(token).ifPresent(refreshTokenRepository::delete);
    }

    public void revokeAllRefreshTokensForAccount(UUID accountId) {
        refreshTokenRepository.deleteByAccountId(accountId);
    }

    public long getAccessTokenValiditySeconds() {
        return props.getAccessTokenValidityMs() / 1000;
    }
}
