package com.homeservices.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.frontend")
@Getter
@Setter
public class FrontendProperties {
    /** Base URL for the User SPA (order tracking, ratings, complaints) */
    private String userBaseUrl = "http://localhost:5173";
    /** Base URL for the Merchant SPA (dashboard, worker management) */
    private String merchantBaseUrl = "http://localhost:5175";
    /** Base URL for the Worker SPA (login, job acceptance) */
    private String workerBaseUrl = "http://localhost:5176";
}
