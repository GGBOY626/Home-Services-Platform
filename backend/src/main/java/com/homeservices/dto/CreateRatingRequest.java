package com.homeservices.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateRatingRequest {

    @NotNull
    @Min(1)
    @Max(5)
    private Integer stars;

    private String comment;  // optional, max 1000 enforced in service
}
