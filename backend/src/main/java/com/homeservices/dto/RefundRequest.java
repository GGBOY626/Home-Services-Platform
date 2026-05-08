package com.homeservices.dto;

import lombok.Data;

@Data
public class RefundRequest {
    /** Amount in cents. If null, full refund is issued. */
    private Integer amountCents;
    private String reason;
}
