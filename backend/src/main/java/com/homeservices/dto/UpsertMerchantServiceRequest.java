package com.homeservices.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpsertMerchantServiceRequest {
    @NotNull
    private Boolean isActive;
    @NotNull
    private Integer priceCents;
}
