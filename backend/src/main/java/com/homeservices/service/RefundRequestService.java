package com.homeservices.service;

import com.homeservices.domain.*;
import com.homeservices.dto.RefundRequestDTO;
import com.homeservices.repository.OrderRepository;
import com.homeservices.repository.RefundRequestRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefundRequestService {

    private final RefundRequestRepository refundRequestRepository;
    private final OrderRepository orderRepository;
    private final StripeService stripeService;

    /** Called automatically when user cancels a paid MERCHANT_ASSIGNED order. */
    @Transactional
    public RefundRequestDTO createForCancelledOrder(UUID orderId, UUID userId, String reason) {
        if (refundRequestRepository.existsByOrderId(orderId)) {
            return toDTO(refundRequestRepository.findByOrderId(orderId).orElseThrow(), orderId);
        }
        RefundRequest req = RefundRequest.builder()
            .orderId(orderId)
            .userId(userId)
            .reason(reason)
            .status(RefundRequestStatus.PENDING)
            .build();
        req = refundRequestRepository.save(req);
        log.info("Refund request created for order {} by user {}", orderId, userId);
        return toDTO(req, orderId);
    }

    public Optional<RefundRequestDTO> findByOrderId(UUID orderId) {
        return refundRequestRepository.findByOrderId(orderId)
            .map(r -> toDTO(r, orderId));
    }

    public Page<RefundRequestDTO> listAll(Pageable pageable) {
        return refundRequestRepository.findAllByOrderByCreatedAtDesc(pageable)
            .map(r -> toDTO(r, r.getOrderId()));
    }

    public Page<RefundRequestDTO> listByStatus(RefundRequestStatus status, Pageable pageable) {
        return refundRequestRepository.findByStatus(status, pageable)
            .map(r -> toDTO(r, r.getOrderId()));
    }

    /** Admin approves → issue Stripe refund, mark APPROVED. */
    @Transactional
    public RefundRequestDTO approve(Long requestId, Integer refundAmountCents, String adminNote, JwtPrincipal admin) {
        RefundRequest req = refundRequestRepository.findById(requestId)
            .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + requestId));
        if (req.getStatus() != RefundRequestStatus.PENDING) {
            throw new IllegalStateException("Refund request is not PENDING. Current: " + req.getStatus());
        }

        // Issue Stripe refund
        stripeService.issueRefund(req.getOrderId(), refundAmountCents, "Admin approved refund request");

        req.setStatus(RefundRequestStatus.APPROVED);
        req.setAdminNote(adminNote);
        req.setDecidedBy(admin.id());
        req.setDecidedAt(Instant.now());
        req = refundRequestRepository.save(req);
        log.info("Refund request {} APPROVED by admin {}", requestId, admin.id());
        return toDTO(req, req.getOrderId());
    }

    /** Admin rejects → no refund, mark REJECTED. */
    @Transactional
    public RefundRequestDTO reject(Long requestId, String adminNote, JwtPrincipal admin) {
        RefundRequest req = refundRequestRepository.findById(requestId)
            .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + requestId));
        if (req.getStatus() != RefundRequestStatus.PENDING) {
            throw new IllegalStateException("Refund request is not PENDING. Current: " + req.getStatus());
        }
        req.setStatus(RefundRequestStatus.REJECTED);
        req.setAdminNote(adminNote);
        req.setDecidedBy(admin.id());
        req.setDecidedAt(Instant.now());
        req = refundRequestRepository.save(req);
        log.info("Refund request {} REJECTED by admin {}", requestId, admin.id());
        return toDTO(req, req.getOrderId());
    }

    private RefundRequestDTO toDTO(RefundRequest req, UUID orderId) {
        RefundRequestDTO.RefundRequestDTOBuilder b = RefundRequestDTO.builder()
            .id(req.getId())
            .orderId(req.getOrderId())
            .userId(req.getUserId())
            .reason(req.getReason())
            .status(req.getStatus())
            .adminNote(req.getAdminNote())
            .decidedBy(req.getDecidedBy())
            .decidedAt(req.getDecidedAt())
            .createdAt(req.getCreatedAt())
            .updatedAt(req.getUpdatedAt());

        orderRepository.findById(orderId).ifPresent(o -> {
            b.serviceNameSnapshot(o.getServiceNameSnapshot());
            b.priceCents(o.getPriceCents());
        });

        return b.build();
    }
}
