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
}
