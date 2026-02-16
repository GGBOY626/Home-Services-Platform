package com.homeservices.dto;

import com.homeservices.domain.ApplicationStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class MerchantApplicationDTO {

    private Long id;
    private String email;
    private String businessName;
    private String contactName;
    private String phone;
    private String address;
    private String nzbnOrAbn;
    private Boolean gstRegistered;
    private String notes;
    private ApplicationStatus status;
    private String adminNote;
    private Instant decidedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
