package com.homeservices.repository;

import com.homeservices.domain.PaymentEventLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentEventLogRepository extends JpaRepository<PaymentEventLog, Long> {
    List<PaymentEventLog> findByOrderIdOrderByCreatedAtAsc(String orderId);
}
