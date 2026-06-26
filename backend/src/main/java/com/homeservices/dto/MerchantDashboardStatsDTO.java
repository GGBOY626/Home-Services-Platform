package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MerchantDashboardStatsDTO {
    private long workerCount;
    private PaymentMethodBreakdownDTO paymentMethodBreakdown;
}
