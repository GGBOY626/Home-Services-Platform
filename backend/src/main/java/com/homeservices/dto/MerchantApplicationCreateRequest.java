package com.homeservices.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MerchantApplicationCreateRequest {

    @NotBlank(message = "Email is required")
    @Email
    private String email;

    @NotBlank(message = "Business name is required")
    @Size(max = 200)
    private String businessName;

    @NotBlank(message = "Contact name is required")
    @Size(max = 120)
    private String contactName;

    @Size(max = 40)
    private String phone;

    @Size(max = 255)
    private String address;

    @Size(max = 40)
    private String nzbnOrAbn;

    private Boolean gstRegistered;

    @Size(max = 2000)
    private String notes;
}
