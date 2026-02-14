package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ServiceItemDTO {
    private Long id;
    private Long categoryId;
    private String categoryCode;
    private String categoryName;
    private String code;
    private String name;
    private String description;
    private Integer basePriceCents;
    private Integer durationMinutes;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
}
