package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class PaymentEventLogDTO {
    private Long id;
    private String orderId;
    private String eventType;
    private String oldStatus;
    private String newStatus;
    private String actor;
    private String stripeRef;
    private Integer amountCents;
    private String note;
    private Instant createdAt;
}
