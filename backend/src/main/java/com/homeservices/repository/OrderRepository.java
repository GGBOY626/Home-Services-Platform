package com.homeservices.repository;

import com.homeservices.domain.Order;
import com.homeservices.domain.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    Page<Order> findByCreatedBy(UUID createdBy, Pageable pageable);

    Page<Order> findByMerchantId(UUID merchantId, Pageable pageable);

    Page<Order> findByWorkerId(UUID workerId, Pageable pageable);

    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<Order> findByStatusAndMerchantAssignDeadlineBefore(OrderStatus status, Instant deadline);

    List<Order> findByStatusAndWorkerAcceptDeadlineBefore(OrderStatus status, Instant deadline);

    List<Order> findByStatus(OrderStatus status);

    Optional<Order> findByStripePaymentIntentId(String stripePaymentIntentId);
}
