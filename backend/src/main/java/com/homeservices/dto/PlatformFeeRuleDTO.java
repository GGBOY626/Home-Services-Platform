package com.homeservices.dto;

import com.homeservices.domain.FeeRuleScope;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class PlatformFeeRuleDTO {
    private Long id;
    private FeeRuleScope scope;
    private Long categoryId;
    private Integer feeRateBps;
    private Boolean isActive;
    private Instant effectiveFrom;
    private Instant effectiveTo;
    private Instant createdAt;
    private Instant updatedAt;
}
