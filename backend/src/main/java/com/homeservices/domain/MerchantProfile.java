package com.homeservices.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "merchant_profile")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MerchantProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "account_id", nullable = false, unique = true, columnDefinition = "CHAR(36)")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID accountId;

    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    @Column(name = "business_address", length = 500)
    private String businessAddress;

    @Column(name = "business_lat")
    private Double businessLat;

    @Column(name = "business_lng")
    private Double businessLng;
}
