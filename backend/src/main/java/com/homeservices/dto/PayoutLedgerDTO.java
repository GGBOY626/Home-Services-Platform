package com.homeservices.dto;

import com.homeservices.domain.LedgerStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class PayoutLedgerDTO {
    private Long id;
    private UUID orderId;
    private UUID merchantId;
    private Integer grossAmountCents;
    private Integer platformFeeCents;
    private Integer merchantNetCents;
    private LedgerStatus status;
    private Instant calculatedAt;
    private Instant paidAt;
    private Instant createdAt;
}
