package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class MerchantMeResponse {

    private UUID id;
    private UUID accountId;
    private String displayName;
    private String businessAddress;
    private Double businessLat;
    private Double businessLng;
}
