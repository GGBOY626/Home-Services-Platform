package com.homeservices.repository;

import com.homeservices.domain.ServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceItemRepository extends JpaRepository<ServiceItem, Long> {

    List<ServiceItem> findByCategoryIdAndIsActiveTrue(Long categoryId);

    List<ServiceItem> findByCategoryIdOrderByCode(Long categoryId);

    List<ServiceItem> findAllByOrderByCategoryIdAscCodeAsc();

    Optional<ServiceItem> findByCode(String code);
}
