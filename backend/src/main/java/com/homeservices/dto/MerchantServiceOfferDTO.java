package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class MerchantServiceOfferDTO {
    private Long id;
    private Long serviceItemId;
    private String serviceItemCode;
    private String serviceItemName;
    private Long categoryId;
    private String categoryCode;
    private String categoryName;
    private Integer basePriceCents;
    private Integer priceCents;
    private Integer durationMinutes;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
}
