package com.homeservices.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateWorkerRequest {
    @NotBlank
    private String displayName;
    @Email
    @NotBlank
    private String email;
}
