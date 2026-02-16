package com.homeservices.dto;

import com.homeservices.domain.ApplicationStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class WorkerApplicationDTO {

    private Long id;
    private String email;
    private String fullName;
    private String phone;
    private String city;
    private String notes;
    private ApplicationStatus status;
    private String adminNote;
    private Instant decidedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
