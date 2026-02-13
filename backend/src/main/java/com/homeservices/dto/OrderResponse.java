package com.homeservices.dto;

import com.homeservices.domain.OrderStatus;
import com.homeservices.domain.ServiceType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class OrderResponse {

    private UUID id;
    private ServiceType serviceType;
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
    private Long version;
}
