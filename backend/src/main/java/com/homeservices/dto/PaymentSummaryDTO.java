package com.homeservices.dto;

import com.homeservices.domain.OrderStatus;
import com.homeservices.domain.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class PaymentSummaryDTO {
    private UUID orderId;
    private String serviceNameSnapshot;
    private Integer priceCents;
    private OrderStatus orderStatus;
    private PaymentStatus paymentStatus;
    private String stripePaymentIntentId;
    private String stripeRefundId;
    private Instant paidAt;
    private Integer refundedAmountCents;
    private Instant refundedAt;
    private Instant createdAt;
}
