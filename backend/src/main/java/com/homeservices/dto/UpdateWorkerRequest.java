package com.homeservices.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateWorkerRequest {
    @NotBlank
    private String displayName;
}
