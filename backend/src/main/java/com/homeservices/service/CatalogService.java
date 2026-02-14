package com.homeservices.service;

import com.homeservices.config.AuditLogging;
import com.homeservices.domain.ServiceCategory;
import com.homeservices.domain.ServiceItem;
import com.homeservices.dto.*;
import com.homeservices.repository.ServiceCategoryRepository;
import com.homeservices.repository.ServiceItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final ServiceCategoryRepository categoryRepository;
    private final ServiceItemRepository serviceItemRepository;

    @Transactional(readOnly = true)
    public List<CategoryWithItemsDTO> getCategoriesWithItems() {
        long start = System.currentTimeMillis();
        List<ServiceCategory> categories = categoryRepository.findByIsActiveTrueOrderBySortOrderAsc();
        List<ServiceItem> allItems = serviceItemRepository.findAllByOrderByCategoryIdAscCodeAsc();
        Map<Long, List<ServiceItem>> byCategory = allItems.stream()
            .filter(i -> Boolean.TRUE.equals(i.getIsActive()))
            .collect(Collectors.groupingBy(ServiceItem::getCategoryId));
        List<CategoryWithItemsDTO> result = categories.stream()
            .map(c -> CategoryWithItemsDTO.builder()
                .id(c.getId())
                .code(c.getCode())
                .name(c.getName())
                .description(c.getDescription())
                .isActive(c.getIsActive())
                .sortOrder(c.getSortOrder())
                .items(byCategory.getOrDefault(c.getId(), List.of()).stream()
                    .map(this::toItemDTO)
                    .toList())
                .build())
            .toList();
        AuditLogging.logRead("ServiceCategory+ServiceItem", "public catalog", "size=" + result.size(), System.currentTimeMillis() - start);
        return result;
    }

    @Transactional(readOnly = true)
    public List<ServiceItemDTO> getServicesByCategoryCode(String categoryCode) {
        long start = System.currentTimeMillis();
        ServiceCategory cat = categoryRepository.findByCode(categoryCode)
            .orElseThrow(() -> new IllegalArgumentException("Category not found: " + categoryCode));
        List<ServiceItem> items = serviceItemRepository.findByCategoryIdAndIsActiveTrue(cat.getId());
        AuditLogging.logRead("ServiceItem", "categoryCode=" + categoryCode, "size=" + items.size(), System.currentTimeMillis() - start);
        return items.stream().map(this::toItemDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceCategoryDTO> getCategoriesForAdmin() {
        long start = System.currentTimeMillis();
        List<ServiceCategory> list = categoryRepository.findAllByOrderBySortOrderAsc();
        AuditLogging.logRead("ServiceCategory", "admin", "size=" + list.size(), System.currentTimeMillis() - start);
        return list.stream().map(this::toCategoryDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceItemDTO> getItemsForAdmin() {
        long start = System.currentTimeMillis();
        List<ServiceItem> list = serviceItemRepository.findAllByOrderByCategoryIdAscCodeAsc();
        Map<Long, ServiceCategory> categoryMap = categoryRepository.findAll().stream().collect(Collectors.toMap(ServiceCategory::getId, c -> c));
        List<ServiceItemDTO> result = list.stream().map(i -> {
            ServiceCategory c = categoryMap.get(i.getCategoryId());
            return toItemDTO(i, c != null ? c.getCode() : null, c != null ? c.getName() : null);
        }).toList();
        AuditLogging.logRead("ServiceItem", "admin", "size=" + result.size(), System.currentTimeMillis() - start);
        return result;
    }

    @Transactional
    public ServiceCategoryDTO createCategory(CreateCategoryRequest request) {
        long start = System.currentTimeMillis();
        ServiceCategory c = ServiceCategory.builder()
            .code(request.getCode().trim())
            .name(request.getName().trim())
            .description(request.getDescription() != null ? request.getDescription().trim() : null)
            .isActive(request.getIsActive())
            .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
            .build();
        c = categoryRepository.save(c);
        AuditLogging.logWrite("CREATE", "ServiceCategory", "id=" + c.getId(), System.currentTimeMillis() - start);
        return toCategoryDTO(c);
    }

    @Transactional
    public ServiceCategoryDTO updateCategory(Long id, UpdateCategoryRequest request) {
        long start = System.currentTimeMillis();
        ServiceCategory c = categoryRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Category not found: " + id));
        c.setCode(request.getCode().trim());
        c.setName(request.getName().trim());
        c.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        c.setIsActive(request.getIsActive());
        c.setSortOrder(request.getSortOrder());
        c = categoryRepository.save(c);
        AuditLogging.logWrite("UPDATE", "ServiceCategory", "id=" + id, System.currentTimeMillis() - start);
        return toCategoryDTO(c);
    }

    @Transactional
    public ServiceItemDTO createItem(CreateServiceItemRequest request) {
        long start = System.currentTimeMillis();
        if (!categoryRepository.existsById(request.getCategoryId())) {
            throw new IllegalArgumentException("Category not found: " + request.getCategoryId());
        }
        ServiceItem i = ServiceItem.builder()
            .categoryId(request.getCategoryId())
            .code(request.getCode().trim())
            .name(request.getName().trim())
            .description(request.getDescription() != null ? request.getDescription().trim() : null)
            .basePriceCents(request.getBasePriceCents())
            .durationMinutes(request.getDurationMinutes())
            .isActive(request.getIsActive() != null ? request.getIsActive() : true)
            .build();
        i = serviceItemRepository.save(i);
        ServiceCategory cat = categoryRepository.findById(request.getCategoryId()).orElse(null);
        AuditLogging.logWrite("CREATE", "ServiceItem", "id=" + i.getId(), System.currentTimeMillis() - start);
        return toItemDTO(i, cat != null ? cat.getCode() : null, cat != null ? cat.getName() : null);
    }

    @Transactional
    public ServiceItemDTO updateItem(Long id, UpdateServiceItemRequest request) {
        long start = System.currentTimeMillis();
        ServiceItem i = serviceItemRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Service item not found: " + id));
        if (!categoryRepository.existsById(request.getCategoryId())) {
            throw new IllegalArgumentException("Category not found: " + request.getCategoryId());
        }
        i.setCategoryId(request.getCategoryId());
        i.setCode(request.getCode().trim());
        i.setName(request.getName().trim());
        i.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        i.setBasePriceCents(request.getBasePriceCents());
        i.setDurationMinutes(request.getDurationMinutes());
        i.setIsActive(request.getIsActive());
        i = serviceItemRepository.save(i);
        ServiceCategory cat = categoryRepository.findById(request.getCategoryId()).orElse(null);
        AuditLogging.logWrite("UPDATE", "ServiceItem", "id=" + id, System.currentTimeMillis() - start);
        return toItemDTO(i, cat != null ? cat.getCode() : null, cat != null ? cat.getName() : null);
    }

    private ServiceCategoryDTO toCategoryDTO(ServiceCategory c) {
        return ServiceCategoryDTO.builder()
            .id(c.getId())
            .code(c.getCode())
            .name(c.getName())
            .description(c.getDescription())
            .isActive(c.getIsActive())
            .sortOrder(c.getSortOrder())
            .createdAt(c.getCreatedAt())
            .updatedAt(c.getUpdatedAt())
            .build();
    }

    private ServiceItemDTO toItemDTO(ServiceItem i) {
        return toItemDTO(i, null, null);
    }

    private ServiceItemDTO toItemDTO(ServiceItem i, String categoryCode, String categoryName) {
        return ServiceItemDTO.builder()
            .id(i.getId())
            .categoryId(i.getCategoryId())
            .categoryCode(categoryCode)
            .categoryName(categoryName)
            .code(i.getCode())
            .name(i.getName())
            .description(i.getDescription())
            .basePriceCents(i.getBasePriceCents())
            .durationMinutes(i.getDurationMinutes())
            .isActive(i.getIsActive())
            .createdAt(i.getCreatedAt())
            .updatedAt(i.getUpdatedAt())
            .build();
    }
}
