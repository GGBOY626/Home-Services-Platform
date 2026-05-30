package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserProfileDTO {
    private String email;
    private String homeAddress;
    private Double homeLat;
    private Double homeLng;
}
