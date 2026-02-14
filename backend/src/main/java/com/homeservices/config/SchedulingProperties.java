package com.homeservices.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.scheduling")
public class SchedulingProperties {

    /** Minimum hours from now for scheduledAt (default 1). */
    private int minHoursAhead = 1;

    /** Maximum days from now for scheduledAt (default 60). */
    private int maxDaysAhead = 60;

    public int getMinHoursAhead() {
        return minHoursAhead;
    }

    public void setMinHoursAhead(int minHoursAhead) {
        this.minHoursAhead = minHoursAhead;
    }

    public int getMaxDaysAhead() {
        return maxDaysAhead;
    }

    public void setMaxDaysAhead(int maxDaysAhead) {
        this.maxDaysAhead = maxDaysAhead;
    }
}
