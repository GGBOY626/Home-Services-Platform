package com.homeservices.dto;

import com.homeservices.domain.ServiceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateOrderRequest {

    @NotNull(message = "Service type is required")
    private ServiceType serviceType;

    @NotBlank(message = "Address is required")
    private String address;

    private String notes;
}
