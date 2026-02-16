package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class RatingSummaryDTO {

    private double averageStars;
    private long totalCount;
    private Map<Integer, Long> distribution;  // 1 -> count, 2 -> count, ... 5 -> count
    private java.util.List<String> recentComments;  // top 5, optional
}
