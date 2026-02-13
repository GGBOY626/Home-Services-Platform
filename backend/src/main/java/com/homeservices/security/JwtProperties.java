package com.homeservices.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    private long accessTokenValidityMs = TimeUnit.MINUTES.toMillis(15);
    private int refreshTokenValidityDays = 7;
    private String secret;

    public long getAccessTokenValidityMs() {
        return accessTokenValidityMs;
    }

    public void setAccessTokenValidityMs(long accessTokenValidityMs) {
        this.accessTokenValidityMs = accessTokenValidityMs;
    }

    public int getRefreshTokenValidityDays() {
        return refreshTokenValidityDays;
    }

    public void setRefreshTokenValidityDays(int refreshTokenValidityDays) {
        this.refreshTokenValidityDays = refreshTokenValidityDays;
    }

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }
}
