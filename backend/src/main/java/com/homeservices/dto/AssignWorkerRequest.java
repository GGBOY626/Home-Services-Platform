package com.homeservices.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AssignWorkerRequest {

    @NotNull(message = "Worker ID is required")
    private UUID workerId;
}
