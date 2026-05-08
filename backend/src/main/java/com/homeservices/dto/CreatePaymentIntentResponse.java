package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CreatePaymentIntentResponse {
    private String clientSecret;
    private String publishableKey;
    private String paymentIntentId;
    private String orderId;
    private Integer amountCents;
    private String currency;
}
