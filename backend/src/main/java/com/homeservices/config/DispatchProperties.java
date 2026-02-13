package com.homeservices.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.dispatch")
public class DispatchProperties {

    private int merchantAssignTtlMinutes = 10;
    private int workerAcceptTtlMinutes = 5;

    public int getMerchantAssignTtlMinutes() {
        return merchantAssignTtlMinutes;
    }

    public void setMerchantAssignTtlMinutes(int merchantAssignTtlMinutes) {
        this.merchantAssignTtlMinutes = merchantAssignTtlMinutes;
    }

    public int getWorkerAcceptTtlMinutes() {
        return workerAcceptTtlMinutes;
    }

    public void setWorkerAcceptTtlMinutes(int workerAcceptTtlMinutes) {
        this.workerAcceptTtlMinutes = workerAcceptTtlMinutes;
    }
}
