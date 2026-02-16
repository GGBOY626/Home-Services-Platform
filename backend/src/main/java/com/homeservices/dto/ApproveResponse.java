package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ApproveResponse {

    private WorkerApplicationDTO application;
    private String tempPassword;

    // For merchant approval
    private MerchantApplicationDTO merchantApplication;
}
