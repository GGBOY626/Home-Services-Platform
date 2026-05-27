package com.homeservices.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateLocationRequest {

    @NotBlank(message = "Address is required")
    private String address;

    @NotNull(message = "Latitude is required")
    private Double lat;

    @NotNull(message = "Longitude is required")
    private Double lng;
}
