package com.homeservices.repository;

import com.homeservices.domain.LedgerStatus;
import com.homeservices.domain.PayoutLedger;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayoutLedgerRepository extends JpaRepository<PayoutLedger, Long> {

    Optional<PayoutLedger> findByOrderId(UUID orderId);

    boolean existsByOrderId(UUID orderId);

    Page<PayoutLedger> findByMerchantId(UUID merchantId, Pageable pageable);

    @Query("SELECT l FROM PayoutLedger l WHERE l.merchantId = :merchantId AND (:status IS NULL OR l.status = :status) AND l.calculatedAt >= :fromInclusive AND l.calculatedAt < :toExclusive")
    Page<PayoutLedger> findByMerchantIdAndFilters(@Param("merchantId") UUID merchantId,
                                                   @Param("status") LedgerStatus status,
                                                   @Param("fromInclusive") Instant fromInclusive,
                                                   @Param("toExclusive") Instant toExclusive,
                                                   Pageable pageable);

    @Query("SELECT l FROM PayoutLedger l WHERE (:merchantId IS NULL OR l.merchantId = :merchantId) AND (:status IS NULL OR l.status = :status) AND l.calculatedAt >= :fromInclusive AND l.calculatedAt < :toExclusive")
    Page<PayoutLedger> findByAdminFilters(@Param("merchantId") UUID merchantId,
                                           @Param("status") LedgerStatus status,
                                           @Param("fromInclusive") Instant fromInclusive,
                                           @Param("toExclusive") Instant toExclusive,
                                           Pageable pageable);

    @Query("SELECT l FROM PayoutLedger l WHERE l.calculatedAt >= :fromInclusive AND l.calculatedAt < :toExclusive")
    List<PayoutLedger> findAllInDateRange(@Param("fromInclusive") Instant fromInclusive,
                                          @Param("toExclusive") Instant toExclusive);
}
