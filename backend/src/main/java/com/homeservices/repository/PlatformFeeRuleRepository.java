package com.homeservices.repository;

import com.homeservices.domain.FeeRuleScope;
import com.homeservices.domain.PlatformFeeRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformFeeRuleRepository extends JpaRepository<PlatformFeeRule, Long> {

    List<PlatformFeeRule> findByIsActiveTrueOrderByScopeAscCategoryIdAsc();

    Optional<PlatformFeeRule> findByScopeAndIsActiveTrue(FeeRuleScope scope);

    Optional<PlatformFeeRule> findByScopeAndCategoryIdAndIsActiveTrue(FeeRuleScope scope, Long categoryId);

    List<PlatformFeeRule> findAllByOrderByScopeAscCategoryIdAsc();
}
