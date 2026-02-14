package com.homeservices.service;

import com.homeservices.domain.FeeRuleScope;
import com.homeservices.domain.Order;
import com.homeservices.domain.PlatformFeeRule;
import com.homeservices.repository.PlatformFeeRuleRepository;
import com.homeservices.repository.ServiceItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Resolves the platform fee rate (basis points) for an order.
 * CATEGORY rule overrides GLOBAL if active and within effective window.
 */
@Service
@RequiredArgsConstructor
public class FeeRuleResolver {

    private final PlatformFeeRuleRepository feeRuleRepository;
    private final ServiceItemRepository serviceItemRepository;

    @Transactional(readOnly = true)
    public int resolveFeeRateBps(Order order) {
        Instant now = Instant.now();
        Long categoryId = serviceItemRepository.findById(order.getServiceItemId())
            .map(item -> item.getCategoryId())
            .orElse(null);

        if (categoryId != null) {
            var categoryRule = feeRuleRepository.findByScopeAndCategoryIdAndIsActiveTrue(FeeRuleScope.CATEGORY, categoryId);
            if (categoryRule.isPresent() && withinWindow(categoryRule.get(), now)) {
                return categoryRule.get().getFeeRateBps();
            }
        }

        var globalRule = feeRuleRepository.findByScopeAndIsActiveTrue(FeeRuleScope.GLOBAL)
            .orElseThrow(() -> new IllegalStateException("No active GLOBAL platform fee rule found"));
        if (!withinWindow(globalRule, now)) {
            // If effectiveFrom is in the future (e.g. timezone/clock skew), still use the rule so confirmation does not fail
            if (ruleEffectiveFromInFutureOnly(globalRule, now)) {
                return globalRule.getFeeRateBps();
            }
            throw new IllegalStateException("Active GLOBAL fee rule is not within effective window");
        }
        return globalRule.getFeeRateBps();
    }

    private static boolean withinWindow(PlatformFeeRule rule, Instant now) {
        if (rule.getEffectiveFrom() != null && now.isBefore(rule.getEffectiveFrom())) {
            return false;
        }
        if (rule.getEffectiveTo() != null && !now.isBefore(rule.getEffectiveTo())) {
            return false;
        }
        return true;
    }

    /** True if the only reason we're "outside" the window is effectiveFrom in the future (e.g. DB timezone vs app clock). */
    private static boolean ruleEffectiveFromInFutureOnly(PlatformFeeRule rule, Instant now) {
        if (rule.getEffectiveTo() != null && !now.isBefore(rule.getEffectiveTo())) {
            return false;
        }
        return rule.getEffectiveFrom() != null && now.isBefore(rule.getEffectiveFrom());
    }
}
