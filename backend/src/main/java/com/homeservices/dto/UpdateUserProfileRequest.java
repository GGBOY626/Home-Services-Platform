package com.homeservices.dto;

import lombok.Data;

@Data
public class UpdateUserProfileRequest {
    private String homeAddress;
    private Double homeLat;
    private Double homeLng;
}
