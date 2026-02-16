package com.homeservices.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ApproveRejectRequest {

    @Size(max = 1000)
    private String adminNote;
}
