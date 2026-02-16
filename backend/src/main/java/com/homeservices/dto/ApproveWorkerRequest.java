package com.homeservices.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class ApproveWorkerRequest {

    @NotNull(message = "Merchant ID is required to assign the worker")
    private UUID merchantId;

    @Size(max = 1000)
    private String adminNote;
}
