package com.homeservices.dto;

import com.homeservices.domain.OrderStatus;
import com.homeservices.domain.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class OrderResponse {

    private UUID id;
    private Long serviceItemId;
    private String serviceNameSnapshot;
    private Integer priceCents;
    private Integer durationMinutesSnapshot;
    private String address;
    private String notes;
    private OrderStatus status;
    private UUID merchantId;
    private UUID workerId;
    private UUID createdBy;
    private Instant createdAt;
    private Instant updatedAt;
    private String cancelReason;
    private String cancelledByRole;
    private UUID cancelledById;
    private Instant cancelledAt;
    private Instant merchantAssignDeadline;
    private Instant workerAcceptDeadline;
    private Instant scheduledAt;
    private Long version;

    private String stripePaymentIntentId;
    private PaymentStatus paymentStatus;
    private Instant paidAt;
    private Integer refundedAmountCents;
    private Instant refundedAt;

    private Double addressLat;
    private Double addressLng;

    private Instant otpVerifiedAt;
}
