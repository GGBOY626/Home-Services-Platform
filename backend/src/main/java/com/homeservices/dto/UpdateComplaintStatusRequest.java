package com.homeservices.dto;

import com.homeservices.domain.ComplaintStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateComplaintStatusRequest {

    @NotNull
    private ComplaintStatus status;

    private String note;
}
