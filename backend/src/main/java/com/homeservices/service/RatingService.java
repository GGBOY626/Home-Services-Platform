package com.homeservices.service;

import com.homeservices.config.AuditActions;
import com.homeservices.config.AuditLogging;
import com.homeservices.domain.Order;
import com.homeservices.domain.OrderRating;
import com.homeservices.domain.OrderStatus;
import com.homeservices.dto.RatingDTO;
import com.homeservices.dto.RatingSummaryDTO;
import com.homeservices.repository.OrderRatingRepository;
import com.homeservices.repository.OrderRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RatingService {

    private static final int MAX_COMMENT_LENGTH = 1000;
    private static final int RECENT_COMMENTS_LIMIT = 5;

    private final OrderRepository orderRepository;
    private final OrderRatingRepository ratingRepository;
    private final AuditEventService auditEventService;

    @Transactional
    public RatingDTO createRating(UUID orderId, UUID userId, int stars, String comment, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (!order.getCreatedBy().equals(userId)) {
            throw new IllegalArgumentException("Order does not belong to you");
        }
        if (order.getStatus() != OrderStatus.CLOSED) {
            throw new IllegalStateException("Rating can only be submitted when order status is CLOSED. Current: " + order.getStatus());
        }
        if (ratingRepository.existsByOrderId(orderId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Rating already submitted.");
        }
        if (stars < 1 || stars > 5) {
            throw new IllegalArgumentException("Stars must be between 1 and 5");
        }
        String commentTrimmed = comment != null ? comment.trim() : "";
        if (commentTrimmed.length() > MAX_COMMENT_LENGTH) {
            throw new IllegalArgumentException("Comment must be at most " + MAX_COMMENT_LENGTH + " characters");
        }

        OrderRating rating = OrderRating.builder()
            .orderId(orderId)
            .userId(userId)
            .merchantId(order.getMerchantId())
            .workerId(order.getWorkerId())
            .serviceItemId(order.getServiceItemId())
            .stars(stars)
            .comment(commentTrimmed.isEmpty() ? null : commentTrimmed)
            .build();
        rating = ratingRepository.save(rating);

        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("CREATE", "OrderRating",
            "id=" + rating.getId() + ",orderId=" + orderId + ",stars=" + stars,
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.RATING_CREATE, "RATING", rating.getId().toString(),
            "Rating created", java.util.Map.of("orderId", orderId.toString(), "stars", stars), (int) dur);
        return toDTO(rating, order.getServiceNameSnapshot());
    }

    @Transactional(readOnly = true)
    public Optional<RatingDTO> getRatingByOrder(UUID orderId, UUID userId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (!order.getCreatedBy().equals(userId)) {
            AuditLogging.logRead("OrderRating", "orderId=" + orderId, "accessDenied", System.currentTimeMillis() - start);
            return Optional.empty();
        }
        Optional<OrderRating> opt = ratingRepository.findByOrderId(orderId);
        AuditLogging.logRead("OrderRating", "orderId=" + orderId, "found=" + opt.isPresent(), System.currentTimeMillis() - start);
        return opt.map(r -> toDTO(r, order.getServiceNameSnapshot()));
    }

    @Transactional(readOnly = true)
    public Page<RatingDTO> listForUser(UUID userId, Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Page<OrderRating> page = ratingRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        Page<RatingDTO> result = page.map(r -> {
            String sn = orderRepository.findById(r.getOrderId()).map(Order::getServiceNameSnapshot).orElse(null);
            return toDTO(r, sn);
        });
        AuditLogging.logRead("OrderRating", "userId=" + userId,
            "page=" + page.getNumber() + ",size=" + page.getSize(), System.currentTimeMillis() - start);
        return result;
    }

    @Transactional(readOnly = true)
    public Page<RatingDTO> listForMerchant(UUID merchantId, Instant from, Instant to, Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Page<OrderRating> page = ratingRepository.findByMerchantFiltered(merchantId, from, to, pageable);
        Page<RatingDTO> result = page.map(r -> {
            String sn = orderRepository.findById(r.getOrderId()).map(Order::getServiceNameSnapshot).orElse(null);
            return toDTO(r, sn);
        });
        AuditLogging.logRead("OrderRating", "merchantId=" + merchantId,
            "page=" + page.getNumber() + ",size=" + page.getSize(), System.currentTimeMillis() - start);
        return result;
    }

    @Transactional(readOnly = true)
    public RatingSummaryDTO summaryForMerchant(UUID merchantId, Instant from, Instant to, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        List<OrderRating> list = ratingRepository.findByMerchantFiltered(merchantId, from, to, Pageable.unpaged()).getContent();
        RatingSummaryDTO dto = buildSummary(list);
        AuditLogging.logRead("OrderRating", "merchantId=" + merchantId + ",summary",
            "totalCount=" + dto.getTotalCount(), System.currentTimeMillis() - start);
        return dto;
    }

    @Transactional(readOnly = true)
    public Page<RatingDTO> listForWorker(UUID workerId, Instant from, Instant to, Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Page<OrderRating> page = ratingRepository.findByWorkerFiltered(workerId, from, to, pageable);
        Page<RatingDTO> result = page.map(r -> {
            String sn = orderRepository.findById(r.getOrderId()).map(Order::getServiceNameSnapshot).orElse(null);
            return toDTO(r, sn);
        });
        AuditLogging.logRead("OrderRating", "workerId=" + workerId,
            "page=" + page.getNumber() + ",size=" + page.getSize(), System.currentTimeMillis() - start);
        return result;
    }

    @Transactional(readOnly = true)
    public RatingSummaryDTO summaryForWorker(UUID workerId, Instant from, Instant to, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        List<OrderRating> list = ratingRepository.findByWorkerFiltered(workerId, from, to, Pageable.unpaged()).getContent();
        RatingSummaryDTO dto = buildSummary(list);
        AuditLogging.logRead("OrderRating", "workerId=" + workerId + ",summary",
            "totalCount=" + dto.getTotalCount(), System.currentTimeMillis() - start);
        return dto;
    }

    @Transactional(readOnly = true)
    public Page<RatingDTO> listForAdmin(UUID merchantId, UUID workerId, Instant from, Instant to, Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Page<OrderRating> page = ratingRepository.findAdminFiltered(merchantId, workerId, from, to, pageable);
        Page<RatingDTO> result = page.map(r -> {
            String sn = orderRepository.findById(r.getOrderId()).map(Order::getServiceNameSnapshot).orElse(null);
            return toDTO(r, sn);
        });
        AuditLogging.logRead("OrderRating", "admin merchantId=" + merchantId + ",workerId=" + workerId,
            "page=" + page.getNumber() + ",size=" + page.getSize(), System.currentTimeMillis() - start);
        return result;
    }

    @Transactional(readOnly = true)
    public RatingSummaryDTO summaryForAdmin(Instant from, Instant to, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        List<OrderRating> list = ratingRepository.findAdminFiltered(null, null, from, to, Pageable.unpaged()).getContent();
        RatingSummaryDTO dto = buildSummary(list);
        AuditLogging.logRead("OrderRating", "admin summary", "totalCount=" + dto.getTotalCount(), System.currentTimeMillis() - start);
        return dto;
    }

    @Transactional(readOnly = true)
    public Optional<RatingDTO> getForMerchant(Long ratingId, UUID merchantId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Optional<OrderRating> opt = ratingRepository.findById(ratingId);
        if (opt.isEmpty() || !opt.get().getMerchantId().equals(merchantId)) {
            AuditLogging.logRead("OrderRating", "id=" + ratingId + ",merchantId=" + merchantId, "found=false", System.currentTimeMillis() - start);
            return Optional.empty();
        }
        OrderRating r = opt.get();
        String sn = orderRepository.findById(r.getOrderId()).map(Order::getServiceNameSnapshot).orElse(null);
        AuditLogging.logRead("OrderRating", "id=" + ratingId, "found=true", System.currentTimeMillis() - start);
        return Optional.of(toDTO(r, sn));
    }

    private RatingSummaryDTO buildSummary(List<OrderRating> list) {
        if (list.isEmpty()) {
            return RatingSummaryDTO.builder()
                .averageStars(0)
                .totalCount(0)
                .distribution(Map.of(1, 0L, 2, 0L, 3, 0L, 4, 0L, 5, 0L))
                .recentComments(List.of())
                .build();
        }
        double avg = list.stream().mapToInt(OrderRating::getStars).average().orElse(0);
        Map<Integer, Long> dist = list.stream()
            .collect(Collectors.groupingBy(OrderRating::getStars, Collectors.counting()));
        for (int i = 1; i <= 5; i++) dist.putIfAbsent(i, 0L);

        List<String> recent = list.stream()
            .filter(r -> r.getComment() != null && !r.getComment().isEmpty())
            .sorted(Comparator.comparing(OrderRating::getCreatedAt).reversed())
            .limit(RECENT_COMMENTS_LIMIT)
            .map(OrderRating::getComment)
            .toList();

        return RatingSummaryDTO.builder()
            .averageStars(Math.round(avg * 100.0) / 100.0)
            .totalCount(list.size())
            .distribution(dist)
            .recentComments(recent)
            .build();
    }

    private RatingDTO toDTO(OrderRating r, String serviceNameSnapshot) {
        return RatingDTO.builder()
            .id(r.getId())
            .orderId(r.getOrderId())
            .userId(r.getUserId())
            .merchantId(r.getMerchantId())
            .workerId(r.getWorkerId())
            .serviceItemId(r.getServiceItemId())
            .stars(r.getStars())
            .comment(r.getComment())
            .createdAt(r.getCreatedAt())
            .updatedAt(r.getUpdatedAt())
            .serviceNameSnapshot(serviceNameSnapshot)
            .build();
    }
}
