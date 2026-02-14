package com.homeservices.service;

import com.homeservices.config.AuditLogging;
import com.homeservices.domain.MerchantService;
import com.homeservices.domain.ServiceCategory;
import com.homeservices.domain.ServiceItem;
import com.homeservices.dto.MerchantServiceOfferDTO;
import com.homeservices.dto.UpsertMerchantServiceRequest;
import com.homeservices.repository.MerchantServiceRepository;
import com.homeservices.repository.ServiceCategoryRepository;
import com.homeservices.repository.ServiceItemRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MerchantServiceOfferService {

    private final MerchantServiceRepository merchantServiceRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final ServiceCategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<MerchantServiceOfferDTO> getOffersForMerchant(UUID merchantId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        List<ServiceItem> items = serviceItemRepository.findAllByOrderByCategoryIdAscCodeAsc();
        Map<Long, ServiceCategory> categoryMap = categoryRepository.findAll().stream().collect(Collectors.toMap(ServiceCategory::getId, c -> c));
        Map<Long, MerchantService> offerMap = merchantServiceRepository.findByMerchantId(merchantId).stream()
            .collect(Collectors.toMap(MerchantService::getServiceItemId, o -> o));
        List<MerchantServiceOfferDTO> result = items.stream().map(item -> {
            ServiceCategory cat = categoryMap.get(item.getCategoryId());
            MerchantService offer = offerMap.get(item.getId());
            if (offer != null) {
                return MerchantServiceOfferDTO.builder()
                    .id(offer.getId())
                    .serviceItemId(item.getId())
                    .serviceItemCode(item.getCode())
                    .serviceItemName(item.getName())
                    .categoryId(item.getCategoryId())
                    .categoryCode(cat != null ? cat.getCode() : null)
                    .categoryName(cat != null ? cat.getName() : null)
                    .basePriceCents(item.getBasePriceCents())
                    .priceCents(offer.getPriceCents())
                    .durationMinutes(item.getDurationMinutes())
                    .isActive(offer.getIsActive())
                    .createdAt(offer.getCreatedAt())
                    .updatedAt(offer.getUpdatedAt())
                    .build();
            }
            return MerchantServiceOfferDTO.builder()
                .id(null)
                .serviceItemId(item.getId())
                .serviceItemCode(item.getCode())
                .serviceItemName(item.getName())
                .categoryId(item.getCategoryId())
                .categoryCode(cat != null ? cat.getCode() : null)
                .categoryName(cat != null ? cat.getName() : null)
                .basePriceCents(item.getBasePriceCents())
                .priceCents(item.getBasePriceCents())
                .durationMinutes(item.getDurationMinutes())
                .isActive(false)
                .createdAt(null)
                .updatedAt(null)
                .build();
        }).toList();
        AuditLogging.logRead("MerchantService", "merchantId=" + merchantId, "size=" + result.size(), System.currentTimeMillis() - start);
        return result;
    }

    @Transactional
    public MerchantServiceOfferDTO upsertMerchantService(UUID merchantId, Long serviceItemId, UpsertMerchantServiceRequest request, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        ServiceItem item = serviceItemRepository.findById(serviceItemId)
            .orElseThrow(() -> new IllegalArgumentException("Service item not found: " + serviceItemId));
        MerchantService offer = merchantServiceRepository.findByMerchantIdAndServiceItemId(merchantId, serviceItemId).orElse(null);
        if (offer == null) {
            offer = MerchantService.builder()
                .merchantId(merchantId)
                .serviceItemId(serviceItemId)
                .priceCents(request.getPriceCents())
                .isActive(request.getIsActive())
                .build();
        } else {
            offer.setPriceCents(request.getPriceCents());
            offer.setIsActive(request.getIsActive());
        }
        boolean isNew = (offer.getId() == null);
        offer = merchantServiceRepository.save(offer);
        ServiceCategory cat = categoryRepository.findById(item.getCategoryId()).orElse(null);
        AuditLogging.logWithActor(isNew ? "CREATE" : "UPDATE",
            "MerchantService", "id=" + offer.getId(), principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return MerchantServiceOfferDTO.builder()
            .id(offer.getId())
            .serviceItemId(item.getId())
            .serviceItemCode(item.getCode())
            .serviceItemName(item.getName())
            .categoryId(item.getCategoryId())
            .categoryCode(cat != null ? cat.getCode() : null)
            .categoryName(cat != null ? cat.getName() : null)
            .basePriceCents(item.getBasePriceCents())
            .priceCents(offer.getPriceCents())
            .durationMinutes(item.getDurationMinutes())
            .isActive(offer.getIsActive())
            .createdAt(offer.getCreatedAt())
            .updatedAt(offer.getUpdatedAt())
            .build();
    }
}
