package com.homeservices.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AssignMerchantRequest {

    @NotNull(message = "Merchant ID is required")
    private UUID merchantId;
}
