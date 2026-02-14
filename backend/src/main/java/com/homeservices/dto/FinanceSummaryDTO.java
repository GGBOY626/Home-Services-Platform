package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class FinanceSummaryDTO {
    private long totalGrossCents;
    private long totalPlatformFeeCents;
    private long totalMerchantNetCents;
    private long ledgerCount;
    private long paidCount;
    private long readyCount;
    private Map<String, Long> breakdownByStatus;
}
