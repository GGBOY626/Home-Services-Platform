package com.homeservices.repository;

import com.homeservices.domain.WorkerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.homeservices.domain.WorkerAvailability;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkerProfileRepository extends JpaRepository<WorkerProfile, UUID> {

    Optional<WorkerProfile> findByAccountId(UUID accountId);

    List<WorkerProfile> findByMerchantId(UUID merchantId);

    List<WorkerProfile> findByMerchantIdAndAvailability(UUID merchantId, WorkerAvailability availability);

    long countByMerchantId(UUID merchantId);
}
