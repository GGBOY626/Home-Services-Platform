package com.homeservices.dto;

import lombok.Data;

@Data
public class DecideRefundRequest {
    private String adminNote;
    /** Optional: partial refund amount in cents. Null = full refund when approving. */
    private Integer refundAmountCents;
}
