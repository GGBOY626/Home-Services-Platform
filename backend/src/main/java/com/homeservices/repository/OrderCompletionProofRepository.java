package com.homeservices.repository;

import com.homeservices.domain.OrderCompletionProof;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface OrderCompletionProofRepository extends JpaRepository<OrderCompletionProof, Long> {

    @Query("SELECT p FROM OrderCompletionProof p LEFT JOIN FETCH p.attachments WHERE p.orderId = :orderId")
    Optional<OrderCompletionProof> findByOrderIdWithAttachments(@Param("orderId") UUID orderId);

    Optional<OrderCompletionProof> findByOrderId(UUID orderId);

    boolean existsByOrderId(UUID orderId);
}
