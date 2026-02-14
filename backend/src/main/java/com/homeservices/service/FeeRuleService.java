package com.homeservices.service;

import com.homeservices.config.AuditLogging;
import com.homeservices.domain.FeeRuleScope;
import com.homeservices.domain.PlatformFeeRule;
import com.homeservices.dto.CreateFeeRuleRequest;
import com.homeservices.dto.PlatformFeeRuleDTO;
import com.homeservices.dto.UpdateFeeRuleRequest;
import com.homeservices.repository.PlatformFeeRuleRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FeeRuleService {

    private final PlatformFeeRuleRepository feeRuleRepository;

    @Transactional
    public PlatformFeeRuleDTO create(CreateFeeRuleRequest request, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        PlatformFeeRule rule = PlatformFeeRule.builder()
            .scope(request.getScope())
            .categoryId(request.getCategoryId())
            .feeRateBps(request.getFeeRateBps())
            .isActive(request.getIsActive() != null ? request.getIsActive() : true)
            .effectiveFrom(request.getEffectiveFrom())
            .effectiveTo(request.getEffectiveTo())
            .build();
        rule = feeRuleRepository.save(rule);
        AuditLogging.logWithActor("CREATE", "PlatformFeeRule", "id=" + rule.getId(),
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return toDTO(rule);
    }

    @Transactional
    public PlatformFeeRuleDTO update(Long id, UpdateFeeRuleRequest request, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        PlatformFeeRule rule = feeRuleRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Fee rule not found: " + id));
        rule.setScope(request.getScope());
        rule.setCategoryId(request.getCategoryId());
        rule.setFeeRateBps(request.getFeeRateBps());
        rule.setIsActive(request.getIsActive());
        rule.setEffectiveFrom(request.getEffectiveFrom());
        rule.setEffectiveTo(request.getEffectiveTo());
        rule = feeRuleRepository.save(rule);
        AuditLogging.logWithActor("UPDATE", "PlatformFeeRule", "id=" + id,
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return toDTO(rule);
    }

    private PlatformFeeRuleDTO toDTO(PlatformFeeRule r) {
        return PlatformFeeRuleDTO.builder()
            .id(r.getId())
            .scope(r.getScope())
            .categoryId(r.getCategoryId())
            .feeRateBps(r.getFeeRateBps())
            .isActive(r.getIsActive())
            .effectiveFrom(r.getEffectiveFrom())
            .effectiveTo(r.getEffectiveTo())
            .createdAt(r.getCreatedAt())
            .updatedAt(r.getUpdatedAt())
            .build();
    }
}
