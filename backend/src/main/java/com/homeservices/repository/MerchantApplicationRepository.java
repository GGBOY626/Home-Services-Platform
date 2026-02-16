package com.homeservices.repository;

import com.homeservices.domain.ApplicationStatus;
import com.homeservices.domain.MerchantApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MerchantApplicationRepository extends JpaRepository<MerchantApplication, Long> {

    Optional<MerchantApplication> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<MerchantApplication> findByStatusOrderByCreatedAtDesc(ApplicationStatus status, Pageable pageable);

    Page<MerchantApplication> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
