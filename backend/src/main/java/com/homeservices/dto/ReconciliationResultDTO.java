package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class ReconciliationResultDTO {
    private Instant ranAt;
    private int checkedCount;
    private int fixedCount;
    private List<ReconciliationItem> items;

    @Data
    @Builder
    public static class ReconciliationItem {
        private String orderId;
        private String stripeIntentId;
        private String stripeStatus;
        private String dbStatus;
        private String action;  // "FIXED_PAID" | "FIXED_FAILED" | "OK" | "SKIPPED"
    }
}
