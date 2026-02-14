package com.homeservices.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class SetAvailabilityRequest {

    @NotBlank(message = "availability is required")
    @Pattern(regexp = "ONLINE|OFFLINE", message = "availability must be ONLINE or OFFLINE")
    private String availability;
}
