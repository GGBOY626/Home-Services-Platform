package com.homeservices.repository;

import com.homeservices.domain.StripeWebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StripeWebhookEventRepository extends JpaRepository<StripeWebhookEvent, Long> {
    boolean existsByEventId(String eventId);
}
