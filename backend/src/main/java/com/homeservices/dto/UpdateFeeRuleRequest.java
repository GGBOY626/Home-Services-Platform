package com.homeservices.dto;

import com.homeservices.domain.FeeRuleScope;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;

@Data
public class UpdateFeeRuleRequest {
    @NotNull
    private FeeRuleScope scope;
    private Long categoryId;
    @NotNull
    private Integer feeRateBps;
    @NotNull
    private Boolean isActive;
    @NotNull
    private Instant effectiveFrom;
    private Instant effectiveTo;
}
