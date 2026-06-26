package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentMethodBreakdownDTO {
    private long cashOrderCount;
    private long onlineOrderCount;
    private long cashTotalCents;
    private long onlineTotalCents;
}
