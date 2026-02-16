package com.homeservices.repository;

import com.homeservices.domain.AuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {

    List<AuditEvent> findByRequestIdOrderByCreatedAtAsc(String requestId);

    @Query("SELECT e FROM AuditEvent e WHERE " +
           "(:from IS NULL OR e.createdAt >= :from) AND (:to IS NULL OR e.createdAt <= :to) " +
           "AND (:actorRole IS NULL OR :actorRole = '' OR e.actorRole = :actorRole) " +
           "AND (:actorId IS NULL OR :actorId = '' OR e.actorId = :actorId) " +
           "AND (:action IS NULL OR :action = '' OR e.action = :action) " +
           "AND (:entityType IS NULL OR :entityType = '' OR e.entityType = :entityType) " +
           "AND (:entityId IS NULL OR :entityId = '' OR e.entityId = :entityId) " +
           "AND (:requestId IS NULL OR :requestId = '' OR e.requestId = :requestId) " +
           "AND (:keyword IS NULL OR :keyword = '' OR LOWER(e.summary) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<AuditEvent> findFiltered(
        @Param("from") Instant from,
        @Param("to") Instant to,
        @Param("actorRole") String actorRole,
        @Param("actorId") String actorId,
        @Param("action") String action,
        @Param("entityType") String entityType,
        @Param("entityId") String entityId,
        @Param("requestId") String requestId,
        @Param("keyword") String keyword,
        Pageable pageable);
}
