package com.homeservices.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RescheduleRequest {

    @NotBlank(message = "Scheduled appointment time is required")
    private String scheduledAt;
}
