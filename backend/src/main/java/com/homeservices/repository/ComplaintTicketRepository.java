package com.homeservices.repository;

import com.homeservices.domain.ComplaintCategory;
import com.homeservices.domain.ComplaintStatus;
import com.homeservices.domain.ComplaintTicket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ComplaintTicketRepository extends JpaRepository<ComplaintTicket, Long> {

    List<ComplaintTicket> findByOrderId(UUID orderId);

    Page<ComplaintTicket> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<ComplaintTicket> findByMerchantIdOrderByCreatedAtDesc(UUID merchantId, Pageable pageable);

    @Query("SELECT t FROM ComplaintTicket t WHERE t.userId = :userId " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:from IS NULL OR t.createdAt >= :from) " +
           "AND (:to IS NULL OR t.createdAt <= :to)")
    Page<ComplaintTicket> findByUserFiltered(@Param("userId") UUID userId, @Param("status") ComplaintStatus status,
                                             @Param("from") Instant from, @Param("to") Instant to, Pageable pageable);

    @Query("SELECT t FROM ComplaintTicket t WHERE t.merchantId = :merchantId " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:from IS NULL OR t.createdAt >= :from) " +
           "AND (:to IS NULL OR t.createdAt <= :to)")
    Page<ComplaintTicket> findByMerchantFiltered(@Param("merchantId") UUID merchantId, @Param("status") ComplaintStatus status,
                                                 @Param("from") Instant from, @Param("to") Instant to, Pageable pageable);

    Page<ComplaintTicket> findAllByOrderByCreatedAtDesc(Pageable pageable);

    boolean existsByOrderIdAndUserId(UUID orderId, UUID userId);

    @Query("SELECT t FROM ComplaintTicket t WHERE (:status IS NULL OR t.status = :status) " +
           "AND (:category IS NULL OR t.category = :category) " +
           "AND (:merchantId IS NULL OR t.merchantId = :merchantId) " +
           "AND (:from IS NULL OR t.createdAt >= :from) " +
           "AND (:to IS NULL OR t.createdAt <= :to)")
    Page<ComplaintTicket> findAdminFiltered(
        @Param("status") ComplaintStatus status,
        @Param("category") ComplaintCategory category,
        @Param("merchantId") UUID merchantId,
        @Param("from") Instant from,
        @Param("to") Instant to,
        Pageable pageable);
}
