package com.homeservices.service;

import com.homeservices.config.AuditActions;
import com.homeservices.config.AuditLogging;
import com.homeservices.config.DispatchProperties;
import com.homeservices.domain.Order;
import com.homeservices.domain.OrderStatus;
import com.homeservices.domain.OrderStatusHistory;
import com.homeservices.domain.PaymentStatus;
import com.homeservices.domain.Role;
import com.homeservices.domain.ServiceItem;
import com.homeservices.domain.WorkerAvailability;
import com.homeservices.domain.WorkerProfile;
import com.homeservices.domain.MerchantService;
import com.homeservices.dto.AuditEventCreate;
import com.homeservices.dto.CreateOrderRequest;
import com.homeservices.dto.MerchantSummaryDTO;
import com.homeservices.dto.OrderResponse;
import com.homeservices.repository.MerchantProfileRepository;
import com.homeservices.repository.MerchantServiceRepository;
import com.homeservices.repository.OrderRepository;
import com.homeservices.repository.OrderStatusHistoryRepository;
import com.homeservices.repository.ServiceItemRepository;
import com.homeservices.repository.UserAccountRepository;
import com.homeservices.repository.WorkerProfileRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static com.homeservices.config.RequestIdFilter.MDC_REQUEST_ID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final MerchantProfileRepository merchantProfileRepository;
    private final MerchantServiceRepository merchantServiceRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final com.homeservices.repository.OrderCompletionProofRepository completionProofRepository;
    private final UserAccountRepository userAccountRepository;
    private final DispatchProperties dispatchProperties;
    private final LedgerService ledgerService;
    private final SchedulingValidator schedulingValidator;
    private final AuditEventService auditEventService;
    private final EmailService emailService;
    private final EmailTemplateService emailTemplateService;

    @Transactional
    public OrderResponse create(CreateOrderRequest request, JwtPrincipal principal) {
        ServiceItem item = serviceItemRepository.findById(request.getServiceItemId())
            .orElseThrow(() -> new IllegalArgumentException("Service item not found: " + request.getServiceItemId()));
        if (!Boolean.TRUE.equals(item.getIsActive())) {
            throw new IllegalStateException("Service item is not available for booking");
        }
        Instant scheduledAt;
        try {
            scheduledAt = Instant.parse(request.getScheduledAt());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid scheduled time format. Use ISO-8601 (e.g. 2026-02-18T10:00:00)");
        }
        Instant now = Instant.now();
        schedulingValidator.validate(scheduledAt, now);

        long start = System.currentTimeMillis();
        Instant merchantDeadline = now.plusSeconds(dispatchProperties.getMerchantAssignTtlMinutes() * 60L);
        Order order = Order.builder()
            .serviceItemId(item.getId())
            .serviceNameSnapshot(item.getName())
            .priceCents(item.getBasePriceCents())
            .durationMinutesSnapshot(item.getDurationMinutes())
            .address(request.getAddress().trim())
            .addressLat(request.getAddressLat())
            .addressLng(request.getAddressLng())
            .notes(request.getNotes() != null ? request.getNotes().trim() : null)
            .status(OrderStatus.PLACED)
            .createdBy(principal.id())
            .merchantAssignDeadline(merchantDeadline)
            .scheduledAt(scheduledAt)
            .build();
        order = orderRepository.save(order);
        recordHistory(order.getId(), null, OrderStatus.PLACED.name(), principal.role().name(), principal.id(), null);
        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("CREATE", "Order", "id=" + order.getId() + ",scheduledAt=" + scheduledAt,
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.ORDER_CREATE, "ORDER", order.getId().toString(),
            "Order created", java.util.Map.of("scheduledAt", scheduledAt.toString()), (int) dur);
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

    @Transactional(readOnly = true)
    public List<MerchantSummaryDTO> getEligibleMerchantsForOrder(UUID orderId, JwtPrincipal principal) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        Long serviceItemId = order.getServiceItemId();
        List<MerchantService> offers = merchantServiceRepository.findByServiceItemIdAndIsActiveTrue(serviceItemId);
        return offers.stream()
            .map(MerchantService::getMerchantId)
            .distinct()
            .map(merchantProfileRepository::findById)
            .filter(java.util.Optional::isPresent)
            .map(java.util.Optional::get)
            .map(p -> new MerchantSummaryDTO(p.getId().toString(), p.getDisplayName()))
            .toList();
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
        var offer = merchantServiceRepository.findByMerchantIdAndServiceItemId(merchantId, order.getServiceItemId()).orElse(null);
        if (offer == null || !Boolean.TRUE.equals(offer.getIsActive())) {
            throw new IllegalArgumentException("Merchant does not offer this order's service");
        }
        OrderStatus from = order.getStatus();
        order.setMerchantId(merchantId);
        order.setStatus(OrderStatus.MERCHANT_ASSIGNED);
        order = orderRepository.save(order);
        recordHistory(order.getId(), from.name(), order.getStatus().name(), principal.role().name(), principal.id(), null);
        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.ORDER_ASSIGN_MERCHANT, "ORDER", order.getId().toString(),
            "Order assigned to merchant", java.util.Map.of("merchantId", merchantId.toString(), "fromStatus", from.name()), (int) dur);
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
        if (worker.getAvailability() != WorkerAvailability.ONLINE) {
            AuditLogging.logWithActor("UPDATE", "Order", "assign-worker validation failed: worker OFFLINE",
                principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
            throw new IllegalArgumentException("Selected worker is currently OFFLINE.");
        }
        OrderStatus from = order.getStatus();
        order.setWorkerId(workerId);
        order.setStatus(OrderStatus.WORKER_ASSIGNED);
        order.setWorkerAcceptDeadline(Instant.now().plusSeconds(dispatchProperties.getWorkerAcceptTtlMinutes() * 60L));
        order = orderRepository.save(order);
        recordHistory(order.getId(), from.name(), order.getStatus().name(), principal.role().name(), principal.id(), null);
        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.ORDER_ASSIGN_WORKER, "ORDER", order.getId().toString(),
            "Order assigned to worker", java.util.Map.of("workerId", workerId.toString(), "merchantId", merchantId.toString()), (int) dur);
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

        // Generate 6-digit OTP for worker-customer handshake verification
        String otp = String.format("%06d", new java.security.SecureRandom().nextInt(1_000_000));
        Instant now = Instant.now();
        order.setOtpCode(otp);
        order.setOtpGeneratedAt(now);
        order.setOtpExpiresAt(now.plusSeconds(30 * 60)); // 30 minute expiry

        order = orderRepository.save(order);
        recordHistory(order.getId(), from.name(), order.getStatus().name(), principal.role().name(), principal.id(), null);
        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.ORDER_ACCEPT, "ORDER", order.getId().toString(),
            "Worker accepted order", null, (int) dur);

        // Notify the customer: worker accepted + OTP verification code
        try {
            String customerEmail = userAccountRepository.findById(order.getCreatedBy())
                .map(com.homeservices.domain.UserAccount::getEmail)
                .orElse(null);
            String subject = "Your Worker Is on the Way! — Order #" + orderId.toString().substring(0, 8);
            String htmlBody = emailTemplateService.buildOtpEmail(order);
            if (customerEmail != null) {
                emailService.sendEmail(customerEmail, subject, htmlBody);
            } else {
                log.warn("Could not find customer email for order {}, falling back to fixed recipient", orderId);
                emailService.sendEmail(subject, htmlBody);
            }
        } catch (Exception e) {
            log.warn("Failed to send OTP email for order {}: {}", orderId, e.getMessage());
        }

        return toResponse(order);
    }

    @Transactional
    public OrderResponse verifyOtp(UUID orderId, String otpCode, UUID workerId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.ACCEPTED) {
            throw new IllegalStateException("Order must have status ACCEPTED to verify OTP. Current: " + order.getStatus());
        }
        if (!order.getWorkerId().equals(workerId)) {
            throw new IllegalArgumentException("Order is not assigned to you");
        }
        if (order.getOtpCode() == null) {
            throw new IllegalStateException("No OTP has been generated for this order");
        }
        if (order.getOtpVerifiedAt() != null) {
            throw new IllegalStateException("OTP has already been verified for this order");
        }
        if (order.getOtpExpiresAt() != null && order.getOtpExpiresAt().isBefore(Instant.now())) {
            throw new IllegalStateException("OTP has expired. Please contact support.");
        }
        if (!order.getOtpCode().equals(otpCode.trim())) {
            throw new IllegalArgumentException("Invalid OTP code");
        }
        order.setOtpVerifiedAt(Instant.now());
        order = orderRepository.save(order);
        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId() + ",otpVerified",
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.ORDER_OTP_VERIFY, "ORDER", order.getId().toString(),
            "Worker verified OTP", null, (int) dur);
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
        if (!completionProofRepository.existsByOrderId(orderId)) {
            throw new IllegalStateException("Completion proof is required before confirming completion.");
        }
        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.CLOSED);
        order = orderRepository.save(order);
        recordHistory(order.getId(), from.name(), order.getStatus().name(), principal.role().name(), principal.id(), null);
        ledgerService.createLedgerForOrderIfEligible(order.getId());
        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.ORDER_CONFIRM, "ORDER", order.getId().toString(),
            "User confirmed completion", null, (int) dur);

        // Notify the user to rate the completed order
        try {
            String subject = "Order Closed — Rate Your Experience! — Order #" + orderId.toString().substring(0, 8);
            String htmlBody = emailTemplateService.buildOrderClosedEmail(order);
            emailService.sendEmail(subject, htmlBody);
        } catch (Exception e) {
            log.warn("Failed to send order closed email for order {}: {}", orderId, e.getMessage());
        }

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
        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.ORDER_REJECT_MERCHANT, "ORDER", order.getId().toString(),
            "Merchant rejected order", java.util.Map.of("reason", reason != null ? reason : ""), (int) dur);
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
        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(),
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.ORDER_REJECT_WORKER, "ORDER", order.getId().toString(),
            "Worker rejected order", java.util.Map.of("reason", reason != null ? reason : ""), (int) dur);
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
                auditEventService.recordSync(AuditEventCreate.builder()
                    .requestId("SYSTEM-JOB").actorRole("SYSTEM").action(AuditActions.ORDER_EXPIRE).entityType("ORDER").entityId(order.getId().toString())
                    .summary("Order expired: merchant assign timeout").metadata(java.util.Map.of("orderId", order.getId().toString())).durationMs((int)(System.currentTimeMillis() - start)).build());
            }
            if (!expired.isEmpty()) {
                AuditLogging.logWithActor("UPDATE", "Order", "expiredCount=" + expired.size(), "SYSTEM", null, System.currentTimeMillis() - start);
            }
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
                auditEventService.recordSync(AuditEventCreate.builder()
                    .requestId("SYSTEM-JOB").actorRole("SYSTEM").action(AuditActions.ORDER_ROLLBACK_WORKER_ACCEPT_TIMEOUT).entityType("ORDER").entityId(order.getId().toString())
                    .summary("Order rollback: worker accept timeout").metadata(java.util.Map.of("orderId", order.getId().toString())).durationMs((int)(System.currentTimeMillis() - start)).build());
            }
            if (!expired.isEmpty()) {
                AuditLogging.logWithActor("UPDATE", "Order", "rollbackCount=" + expired.size(), "SYSTEM", null, System.currentTimeMillis() - start);
            }
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
        int dur = (int) (System.currentTimeMillis() - startMs);
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + order.getId(), actorRole, actorId.toString(), dur);
        auditEventService.recordWithContext(actorRole, actorId != null ? actorId.toString() : null, AuditActions.ORDER_CANCEL, "ORDER", order.getId().toString(),
            "Order cancelled", java.util.Map.of("fromStatus", from.name(), "reason", reason != null ? reason : ""), dur);

        // Notify the user that their order has been cancelled
        try {
            String subject = "Your Order Has Been Cancelled — Order #" + order.getId().toString().substring(0, 8);
            String htmlBody = emailTemplateService.buildOrderCancelledEmail(order);
            emailService.sendEmail(subject, htmlBody);
        } catch (Exception e) {
            log.warn("Failed to send order cancelled email for order {}: {}", order.getId(), e.getMessage());
        }

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

    @Transactional
    public OrderResponse markCashPayment(UUID orderId, JwtPrincipal principal) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (!order.getCreatedBy().equals(principal.id())) {
            throw new IllegalArgumentException("Only the order creator can set payment method");
        }
        if (order.getStatus() != OrderStatus.PLACED) {
            throw new IllegalStateException("Can only choose cash payment for PLACED orders. Current: " + order.getStatus());
        }
        if (order.getPaymentStatus() != PaymentStatus.UNPAID &&
            order.getPaymentStatus() != PaymentStatus.FAILED &&
            order.getPaymentStatus() != PaymentStatus.AWAITING) {
            throw new IllegalStateException("Payment method cannot be changed. Current payment status: " + order.getPaymentStatus());
        }
        order.setPaymentStatus(PaymentStatus.CASH_PENDING);
        order = orderRepository.save(order);
        long dur = 0;
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + orderId + ",cashPayment",
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), "ORDER_CASH_PAYMENT", "ORDER", orderId.toString(),
            "User selected cash payment", null, (int) dur);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse reschedule(UUID orderId, String scheduledAtIso, JwtPrincipal principal) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.PLACED) {
            throw new IllegalStateException("Only orders with status PLACED can be rescheduled. Current: " + order.getStatus());
        }
        if (!order.getCreatedBy().equals(principal.id())) {
            throw new IllegalArgumentException("Only the order creator can reschedule");
        }
        Instant scheduledAt;
        try {
            scheduledAt = Instant.parse(scheduledAtIso);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid scheduled time format. Use ISO-8601 (e.g. 2026-02-18T10:00:00)");
        }
        schedulingValidator.validate(scheduledAt, Instant.now());

        long start = System.currentTimeMillis();
        order.setScheduledAt(scheduledAt);
        order = orderRepository.save(order);
        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + orderId + ",reschedule,scheduledAt=" + scheduledAt,
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.ORDER_RESCHEDULE, "ORDER", orderId.toString(),
            "Order rescheduled", java.util.Map.of("scheduledAt", scheduledAt.toString()), (int) dur);
        return toResponse(order);
    }

    OrderResponse toResponse(Order order) {
        return OrderResponse.builder()
            .id(order.getId())
            .serviceItemId(order.getServiceItemId())
            .serviceNameSnapshot(order.getServiceNameSnapshot())
            .priceCents(order.getPriceCents())
            .durationMinutesSnapshot(order.getDurationMinutesSnapshot())
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
            .scheduledAt(order.getScheduledAt())
            .version(order.getVersion())
            .stripePaymentIntentId(order.getStripePaymentIntentId())
            .paymentStatus(order.getPaymentStatus())
            .paidAt(order.getPaidAt())
            .refundedAmountCents(order.getRefundedAmountCents())
            .refundedAt(order.getRefundedAt())
            .addressLat(order.getAddressLat())
            .addressLng(order.getAddressLng())
            .otpVerifiedAt(order.getOtpVerifiedAt())
            .build();
    }
}
