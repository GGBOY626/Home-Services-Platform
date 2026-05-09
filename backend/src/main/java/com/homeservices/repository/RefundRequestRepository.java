package com.homeservices.repository;

import com.homeservices.domain.RefundRequest;
import com.homeservices.domain.RefundRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {
    Optional<RefundRequest> findByOrderId(UUID orderId);
    boolean existsByOrderId(UUID orderId);
    Page<RefundRequest> findByStatus(RefundRequestStatus status, Pageable pageable);
    Page<RefundRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
