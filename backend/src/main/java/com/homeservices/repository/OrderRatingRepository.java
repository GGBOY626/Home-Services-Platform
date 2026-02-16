package com.homeservices.repository;

import com.homeservices.domain.OrderRating;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface OrderRatingRepository extends JpaRepository<OrderRating, Long> {

    Optional<OrderRating> findByOrderId(UUID orderId);

    boolean existsByOrderId(UUID orderId);

    Page<OrderRating> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("SELECT r FROM OrderRating r WHERE r.merchantId = :merchantId " +
           "AND (:from IS NULL OR r.createdAt >= :from) AND (:to IS NULL OR r.createdAt <= :to)")
    Page<OrderRating> findByMerchantFiltered(@Param("merchantId") UUID merchantId,
                                             @Param("from") Instant from, @Param("to") Instant to, Pageable pageable);

    @Query("SELECT r FROM OrderRating r WHERE r.workerId = :workerId " +
           "AND (:from IS NULL OR r.createdAt >= :from) AND (:to IS NULL OR r.createdAt <= :to)")
    Page<OrderRating> findByWorkerFiltered(@Param("workerId") UUID workerId,
                                           @Param("from") Instant from, @Param("to") Instant to, Pageable pageable);

    @Query("SELECT r FROM OrderRating r WHERE (:merchantId IS NULL OR r.merchantId = :merchantId) " +
           "AND (:workerId IS NULL OR r.workerId = :workerId) " +
           "AND (:from IS NULL OR r.createdAt >= :from) AND (:to IS NULL OR r.createdAt <= :to)")
    Page<OrderRating> findAdminFiltered(@Param("merchantId") UUID merchantId, @Param("workerId") UUID workerId,
                                        @Param("from") Instant from, @Param("to") Instant to, Pageable pageable);
}
