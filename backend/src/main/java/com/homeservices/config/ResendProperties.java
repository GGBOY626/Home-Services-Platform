package com.homeservices.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.resend")
@Getter
@Setter
public class ResendProperties {
    private String apiKey;
    private String fromEmail = "onboarding@resend.dev";
    /**
     * When set, ALL outgoing emails will be redirected to this address.
     * Useful in development/testing with Resend free tier, which only allows
     * sending to your own verified email. Leave empty in production when you
     * have a verified domain.
     */
    private String redirectAllTo = "";
}
