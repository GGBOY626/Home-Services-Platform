package com.homeservices.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Slf4j
@Component
@ConfigurationProperties(prefix = "app.stripe")
@Getter
@Setter
public class StripeProperties {
    private String publishableKey;
    private String secretKey;
    private String webhookSecret = "";

    @Autowired
    private Environment environment;

    @PostConstruct
    public void validate() {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("Stripe webhook secret is not configured — webhook endpoints will reject all calls. " +
                     "Set STRIPE_WEBHOOK_SECRET to enable webhook processing.");
        }
    }
}
