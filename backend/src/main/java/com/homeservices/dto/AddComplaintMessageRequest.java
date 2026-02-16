package com.homeservices.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AddComplaintMessageRequest {

    @NotBlank
    private String message;
}
