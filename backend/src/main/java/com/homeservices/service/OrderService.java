package com.homeservices.service;

import com.homeservices.config.AuditLogging;
import com.homeservices.config.DispatchProperties;
import com.homeservices.domain.*;
import com.homeservices.dto.CreateOrderRequest;
import com.homeservices.dto.OrderResponse;
import com.homeservices.repository.MerchantProfileRepository;
import com.homeservices.repository.OrderRepository;
import com.homeservices.repository.OrderStatusHistoryRepository;
import com.homeservices.repository.WorkerProfileRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static com.homeservices.config.RequestIdFilter.MDC_REQUEST_ID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final MerchantProfileRepository merchantProfileRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final DispatchProperties dispatchProperties;

    @Transactional
    public OrderResponse create(CreateOrderRequest request, JwtPrincipal principal) {
        if (request.getServiceType() != ServiceType.CLEANING) {
            throw new IllegalStateException("Only CLEANING service is supported in Phase 1");
        }
        long start = System.currentTimeMillis();
        Instant now = Instant.now();
        Instant merchantDeadline = now.plusSeconds(dispatchProperties.getMerchantAssignTtlMinutes() * 60L);
        Order order = Order.builder()
            .serviceType(request.getServiceType())
            .address(request.getAddress().trim())
            .notes(request.getNotes() != null ? request.getNotes().trim() : null)
            .status(OrderStatus.PLACED)
            .createdBy(principal.id())
            .merchantAssignDeadline(merchantDeadline)
            .build();
        order = orderRepository.save(order);
        recordHistory(order.getId(), null, OrderStatus.PLACED.name(), principal.role().name(), principal.id(), null);
        AuditLogging.logWithActor("CREATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> findByCreatedBy(UUID createdBy, Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Page<Order> page = orderRepository.findByCreatedBy(createdBy, pageable);
        AuditLogging.logRead("Order", "createdBy=" + createdBy,
            "page=" + page.getNumber() + ",size=" + page.getSize(), System.currentTimeMillis() - start);
        return page.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> findAllForAdmin(Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Page<Order> page = orderRepository.findAllByOrderByCreatedAtDesc(pageable);
        AuditLogging.logRead("Order", "all", "page=" + page.getNumber() + ",size=" + page.getSize(),
            System.currentTimeMillis() - start);
        return page.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> findByMerchantId(UUID merchantId, Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Page<Order> page = orderRepository.findByMerchantId(merchantId, pageable);
        AuditLogging.logRead("Order", "merchantId=" + merchantId,
            "page=" + page.getNumber() + ",size=" + page.getSize(), System.currentTimeMillis() - start);
        return page.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> findByWorkerId(UUID workerId, Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Page<Order> page = orderRepository.findByWorkerId(workerId, pageable);
        AuditLogging.logRead("Order", "workerId=" + workerId,
            "page=" + page.getNumber() + ",size=" + page.getSize(), System.currentTimeMillis() - start);
        return page.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public OrderResponse getById(UUID orderId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        AuditLogging.logRead("Order", "id=" + orderId, null, System.currentTimeMillis() - start);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse assignMerchant(UUID orderId, UUID merchantId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.PLACED) {
            throw new IllegalStateException("Only orders with status PLACED can be assigned a merchant. Current: " + order.getStatus());
        }
        if (!merchantProfileRepository.existsById(merchantId)) {
            throw new IllegalArgumentException("Merchant not found: " + merchantId);
        }
        OrderStatus from = order.getStatus();
        order.setMerchantId(merchantId);
        order.setStatus(OrderStatus.MERCHANT_ASSIGNED);
        order = orderRepository.save(order);
        recordHistory(order.getId(), from.name(), order.getStatus().name(), principal.role().name(), principal.id(), null);
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse assignWorker(UUID orderId, UUID workerId, UUID merchantId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.MERCHANT_ASSIGNED) {
            throw new IllegalStateException("Order must have status MERCHANT_ASSIGNED to assign worker. Current: " + order.getStatus());
        }
        if (!order.getMerchantId().equals(merchantId)) {
            throw new IllegalArgumentException("Order is not assigned to your merchant");
        }
        WorkerProfile worker = workerProfileRepository.findById(workerId)
            .orElseThrow(() -> new IllegalArgumentException("Worker not found: " + workerId));
        if (!worker.getMerchantId().equals(merchantId)) {
            throw new IllegalArgumentException("Worker does not belong to your merchant");
        }
        OrderStatus from = order.getStatus();
        order.setWorkerId(workerId);
        order.setStatus(OrderStatus.WORKER_ASSIGNED);
        order.setWorkerAcceptDeadline(Instant.now().plusSeconds(dispatchProperties.getWorkerAcceptTtlMinutes() * 60L));
        order = orderRepository.save(order);
        recordHistory(order.getId(), from.name(), order.getStatus().name(), principal.role().name(), principal.id(), null);
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse accept(UUID orderId, UUID workerId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.WORKER_ASSIGNED) {
            throw new IllegalStateException("Order must have status WORKER_ASSIGNED to accept. Current: " + order.getStatus());
        }
        if (!order.getWorkerId().equals(workerId)) {
            throw new IllegalArgumentException("Order is not assigned to you");
        }
        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.ACCEPTED);
        order.setWorkerAcceptDeadline(null);
        order = orderRepository.save(order);
        recordHistory(order.getId(), from.name(), order.getStatus().name(), principal.role().name(), principal.id(), null);
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse complete(UUID orderId, UUID workerId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.ACCEPTED) {
            throw new IllegalStateException("Order must have status ACCEPTED to complete. Current: " + order.getStatus());
        }
        if (!order.getWorkerId().equals(workerId)) {
            throw new IllegalArgumentException("Order is not assigned to you");
        }
        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.COMPLETED);
        order = orderRepository.save(order);
        recordHistory(order.getId(), from.name(), order.getStatus().name(), principal.role().name(), principal.id(), null);
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse confirmCompletion(UUID orderId, UUID createdBy, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new IllegalStateException("Order must have status COMPLETED to confirm. Current: " + order.getStatus());
        }
        if (!order.getCreatedBy().equals(createdBy)) {
            throw new IllegalArgumentException("Only the user who created the order can confirm completion");
        }
        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.CLOSED);
        order = orderRepository.save(order);
        recordHistory(order.getId(), from.name(), order.getStatus().name(), principal.role().name(), principal.id(), null);
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse cancelByUser(UUID orderId, String reason, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (!order.getCreatedBy().equals(principal.id())) {
            throw new IllegalArgumentException("Only the order creator can cancel");
        }
        if (order.getStatus() != OrderStatus.PLACED && order.getStatus() != OrderStatus.MERCHANT_ASSIGNED) {
            throw new IllegalStateException("User can cancel only when status is PLACED or MERCHANT_ASSIGNED. Current: " + order.getStatus());
        }
        return doCancel(order, reason, principal.role().name(), principal.id(), start);
    }

    @Transactional
    public OrderResponse cancelByAdmin(UUID orderId, String reason, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (order.getStatus() == OrderStatus.CLOSED) {
            throw new IllegalStateException("Cannot cancel an order that is already CLOSED");
        }
        return doCancel(order, reason, principal.role().name(), principal.id(), start);
    }

    @Transactional
    public OrderResponse cancelByMerchant(UUID orderId, String reason, UUID merchantId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.MERCHANT_ASSIGNED) {
            throw new IllegalStateException("Merchant can cancel only when status is MERCHANT_ASSIGNED. Current: " + order.getStatus());
        }
        if (!order.getMerchantId().equals(merchantId)) {
            throw new IllegalArgumentException("Order is not assigned to your merchant");
        }
        return doCancel(order, reason, principal.role().name(), principal.id(), start);
    }

    @Transactional
    public OrderResponse rejectByMerchant(UUID orderId, String reason, UUID merchantId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.MERCHANT_ASSIGNED) {
            throw new IllegalStateException("Merchant can reject only when status is MERCHANT_ASSIGNED. Current: " + order.getStatus());
        }
        if (!order.getMerchantId().equals(merchantId)) {
            throw new IllegalArgumentException("Order is not assigned to your merchant");
        }
        OrderStatus from = order.getStatus();
        order.setMerchantId(null);
        order.setWorkerId(null);
        order.setStatus(OrderStatus.PLACED);
        order.setMerchantAssignDeadline(Instant.now().plusSeconds(dispatchProperties.getMerchantAssignTtlMinutes() * 60L));
        order = orderRepository.save(order);
        recordHistory(order.getId(), from.name(), order.getStatus().name(), principal.role().name(), principal.id(), reason);
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse rejectByWorker(UUID orderId, String reason, UUID workerId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.WORKER_ASSIGNED) {
            throw new IllegalStateException("Worker can reject only when status is WORKER_ASSIGNED. Current: " + order.getStatus());
        }
        if (!order.getWorkerId().equals(workerId)) {
            throw new IllegalArgumentException("Order is not assigned to you");
        }
        OrderStatus from = order.getStatus();
        order.setWorkerId(null);
        order.setStatus(OrderStatus.MERCHANT_ASSIGNED);
        order.setWorkerAcceptDeadline(null);
        order = orderRepository.save(order);
        recordHistory(order.getId(), from.name(), order.getStatus().name(), principal.role().name(), principal.id(), reason);
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return toResponse(order);
    }

    @Transactional
    public int processMerchantAssignTimeouts() {
        String prevRequestId = MDC.get(MDC_REQUEST_ID);
        MDC.put(MDC_REQUEST_ID, "SYSTEM-JOB");
        try {
            long start = System.currentTimeMillis();
            Instant now = Instant.now();
            List<Order> expired = orderRepository.findByStatusAndMerchantAssignDeadlineBefore(OrderStatus.PLACED, now);
            for (Order order : expired) {
                OrderStatus from = order.getStatus();
                order.setStatus(OrderStatus.EXPIRED);
                order.setMerchantAssignDeadline(null);
                orderRepository.save(order);
                recordHistory(order.getId(), from.name(), OrderStatus.EXPIRED.name(), "SYSTEM", null, "Merchant assign deadline exceeded");
            }
            AuditLogging.logWithActor("UPDATE", "Order", "expiredCount=" + expired.size(), "SYSTEM", null, System.currentTimeMillis() - start);
            return expired.size();
        } finally {
            if (prevRequestId != null) {
                MDC.put(MDC_REQUEST_ID, prevRequestId);
            } else {
                MDC.remove(MDC_REQUEST_ID);
            }
        }
    }

    @Transactional
    public int processWorkerAcceptTimeouts() {
        String prevRequestId = MDC.get(MDC_REQUEST_ID);
        MDC.put(MDC_REQUEST_ID, "SYSTEM-JOB");
        try {
            long start = System.currentTimeMillis();
            Instant now = Instant.now();
            List<Order> expired = orderRepository.findByStatusAndWorkerAcceptDeadlineBefore(OrderStatus.WORKER_ASSIGNED, now);
            for (Order order : expired) {
                OrderStatus from = order.getStatus();
                order.setWorkerId(null);
                order.setStatus(OrderStatus.MERCHANT_ASSIGNED);
                order.setWorkerAcceptDeadline(null);
                orderRepository.save(order);
                recordHistory(order.getId(), from.name(), OrderStatus.MERCHANT_ASSIGNED.name(), "SYSTEM", null, "Worker accept deadline exceeded");
            }
            AuditLogging.logWithActor("UPDATE", "Order", "rollbackCount=" + expired.size(), "SYSTEM", null, System.currentTimeMillis() - start);
            return expired.size();
        } finally {
            if (prevRequestId != null) {
                MDC.put(MDC_REQUEST_ID, prevRequestId);
            } else {
                MDC.remove(MDC_REQUEST_ID);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<com.homeservices.dto.OrderStatusHistoryItem> getHistory(UUID orderId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        List<OrderStatusHistory> list = orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(orderId);
        AuditLogging.logRead("OrderStatusHistory", "orderId=" + orderId, "size=" + list.size(), System.currentTimeMillis() - start);
        return list.stream()
            .map(h -> com.homeservices.dto.OrderStatusHistoryItem.builder()
                .id(h.getId())
                .fromStatus(h.getFromStatus())
                .toStatus(h.getToStatus())
                .actorRole(h.getActorRole())
                .actorId(h.getActorId())
                .reason(h.getReason())
                .createdAt(h.getCreatedAt())
                .build())
            .toList();
    }

    private OrderResponse doCancel(Order order, String reason, String actorRole, UUID actorId, long startMs) {
        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelReason(reason != null ? reason.trim() : null);
        order.setCancelledByRole(actorRole);
        order.setCancelledById(actorId);
        order.setCancelledAt(Instant.now());
        order.setMerchantAssignDeadline(null);
        order.setWorkerAcceptDeadline(null);
        order = orderRepository.save(order);
        recordHistory(order.getId(), from.name(), OrderStatus.CANCELLED.name(), actorRole, actorId, reason);
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(), actorRole, actorId.toString(), System.currentTimeMillis() - startMs);
        return toResponse(order);
    }

    private void recordHistory(UUID orderId, String fromStatus, String toStatus, String actorRole, UUID actorId, String reason) {
        OrderStatusHistory h = OrderStatusHistory.builder()
            .orderId(orderId)
            .fromStatus(fromStatus)
            .toStatus(toStatus)
            .actorRole(actorRole)
            .actorId(actorId)
            .reason(reason != null ? reason.trim() : null)
            .build();
        orderStatusHistoryRepository.save(h);
    }

    public boolean canUserAccessOrder(Order order, JwtPrincipal principal) {
        if (principal.role() == Role.ADMIN) return true;
        if (principal.role() == Role.USER && order.getCreatedBy().equals(principal.id())) return true;
        if (principal.role() == Role.MERCHANT && order.getMerchantId() != null && hasMerchantId(principal, order.getMerchantId())) return true;
        if (principal.role() == Role.WORKER && order.getWorkerId() != null && order.getWorkerId().equals(getWorkerProfileId(principal))) return true;
        return false;
    }

    private boolean hasMerchantId(JwtPrincipal principal, UUID merchantId) {
        return merchantProfileRepository.findByAccountId(principal.id())
            .map(m -> m.getId().equals(merchantId))
            .orElse(false);
    }

    private UUID getWorkerProfileId(JwtPrincipal principal) {
        return workerProfileRepository.findByAccountId(principal.id())
            .map(WorkerProfile::getId)
            .orElse(null);
    }

    private OrderResponse toResponse(Order order) {
        return OrderResponse.builder()
            .id(order.getId())
            .serviceType(order.getServiceType())
            .address(order.getAddress())
            .notes(order.getNotes())
            .status(order.getStatus())
            .merchantId(order.getMerchantId())
            .workerId(order.getWorkerId())
            .createdBy(order.getCreatedBy())
            .createdAt(order.getCreatedAt())
            .updatedAt(order.getUpdatedAt())
            .cancelReason(order.getCancelReason())
            .cancelledByRole(order.getCancelledByRole())
            .cancelledById(order.getCancelledById())
            .cancelledAt(order.getCancelledAt())
            .merchantAssignDeadline(order.getMerchantAssignDeadline())
            .workerAcceptDeadline(order.getWorkerAcceptDeadline())
            .version(order.getVersion())
            .build();
    }
}
