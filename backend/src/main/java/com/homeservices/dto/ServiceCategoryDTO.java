package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ServiceCategoryDTO {
    private Long id;
    private String code;
    private String name;
    private String description;
    private Boolean isActive;
    private Integer sortOrder;
    private Instant createdAt;
    private Instant updatedAt;
}
