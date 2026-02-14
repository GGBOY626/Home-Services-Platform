package com.homeservices.repository;

import com.homeservices.domain.ServiceCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, Long> {

    List<ServiceCategory> findByIsActiveTrueOrderBySortOrderAsc();

    List<ServiceCategory> findAllByOrderBySortOrderAsc();

    Optional<ServiceCategory> findByCode(String code);
}
