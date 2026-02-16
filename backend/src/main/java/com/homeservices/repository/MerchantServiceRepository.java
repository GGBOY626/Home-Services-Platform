package com.homeservices.repository;

import com.homeservices.domain.MerchantService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MerchantServiceRepository extends JpaRepository<MerchantService, Long> {

    List<MerchantService> findByMerchantId(UUID merchantId);

    Optional<MerchantService> findByMerchantIdAndServiceItemId(UUID merchantId, Long serviceItemId);

    List<MerchantService> findByServiceItemIdAndIsActiveTrue(Long serviceItemId);
}
