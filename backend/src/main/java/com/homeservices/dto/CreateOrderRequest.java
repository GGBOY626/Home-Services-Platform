package com.homeservices.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateOrderRequest {

    @NotNull(message = "Service item is required")
    private Long serviceItemId;

    @NotBlank(message = "Address is required")
    private String address;

    private String notes;

    @NotBlank(message = "Scheduled appointment time is required")
    private String scheduledAt;

    private Double addressLat;
    private Double addressLng;
}
