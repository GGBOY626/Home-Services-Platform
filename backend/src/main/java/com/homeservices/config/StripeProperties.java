package com.homeservices.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.stripe")
@Getter
@Setter
public class StripeProperties {
    private String publishableKey;
    private String secretKey;
    private String webhookSecret = "";
}
