package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CreateWorkerResponse {
    private WorkerSummaryResponse worker;
    private String tempPassword;
}
