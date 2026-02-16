package com.homeservices.repository;

import com.homeservices.domain.ApplicationStatus;
import com.homeservices.domain.WorkerApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WorkerApplicationRepository extends JpaRepository<WorkerApplication, Long> {

    Optional<WorkerApplication> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<WorkerApplication> findByStatusOrderByCreatedAtDesc(ApplicationStatus status, Pageable pageable);

    Page<WorkerApplication> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
