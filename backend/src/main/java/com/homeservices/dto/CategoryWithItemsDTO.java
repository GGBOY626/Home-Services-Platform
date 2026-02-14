package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CategoryWithItemsDTO {
    private Long id;
    private String code;
    private String name;
    private String description;
    private Boolean isActive;
    private Integer sortOrder;
    private List<ServiceItemDTO> items;
}
