package com.homeservices.service;

import com.homeservices.config.SchedulingProperties;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Validates scheduledAt for orders: must be in the future (min hours ahead),
 * within max days ahead, and on a 15-minute increment.
 * Uses server default timezone for "start of day" boundaries (see README).
 */
@Component
public class SchedulingValidator {

    private static final int MINUTE_INCREMENT = 15;

    private final SchedulingProperties schedulingProperties;

    public SchedulingValidator(SchedulingProperties schedulingProperties) {
        this.schedulingProperties = schedulingProperties;
    }

    /**
     * @param scheduledAt parsed instant (e.g. from ISO string)
     * @param now         current time
     * @throws IllegalArgumentException with a clear message if invalid
     */
    public void validate(Instant scheduledAt, Instant now) {
        if (scheduledAt == null) {
            throw new IllegalArgumentException("Scheduled time is required");
        }
        Instant minTime = now.plus(schedulingProperties.getMinHoursAhead(), ChronoUnit.HOURS);
        if (scheduledAt.isBefore(minTime)) {
            throw new IllegalArgumentException(
                "Scheduled time must be at least " + schedulingProperties.getMinHoursAhead() + " hour(s) from now");
        }
        Instant maxTime = now.plus(schedulingProperties.getMaxDaysAhead(), ChronoUnit.DAYS);
        if (scheduledAt.isAfter(maxTime)) {
            throw new IllegalArgumentException(
                "Scheduled time must be within " + schedulingProperties.getMaxDaysAhead() + " days from now");
        }
        ZonedDateTime z = scheduledAt.atZone(ZoneId.systemDefault());
        int minute = z.getMinute();
        int second = z.getSecond();
        int nano = z.getNano();
        if (minute % MINUTE_INCREMENT != 0 || second != 0 || nano != 0) {
            throw new IllegalArgumentException(
                "Scheduled time must be on a 15-minute increment (e.g. 10:00, 10:15, 10:30, 10:45)");
        }
    }
}
