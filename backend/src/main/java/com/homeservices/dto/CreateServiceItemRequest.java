package com.homeservices.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateServiceItemRequest {
    @NotNull
    private Long categoryId;
    @NotBlank
    private String code;
    @NotBlank
    private String name;
    private String description;
    @NotNull
    private Integer basePriceCents;
    @NotNull
    private Integer durationMinutes;
    @NotNull
    private Boolean isActive = true;
}
