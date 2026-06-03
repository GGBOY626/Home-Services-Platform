package com.homeservices.service;

import com.homeservices.config.AuditActions;
import com.homeservices.config.AuditLogging;
import com.homeservices.config.StorageProperties;
import com.homeservices.domain.*;
import com.homeservices.dto.CompletionProofDTO;
import com.homeservices.dto.OrderResponse;
import com.homeservices.repository.OrderCompletionProofRepository;
import com.homeservices.repository.OrderRepository;
import com.homeservices.repository.OrderStatusHistoryRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.homeservices.config.RequestIdFilter.MDC_REQUEST_ID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompletionProofService {

    private final OrderRepository orderRepository;
    private final OrderCompletionProofRepository proofRepository;
    private final OrderStatusHistoryRepository historyRepository;
    private final LocalFileStorageService fileStorage;
    private final StorageProperties storageProperties;
    private final OrderService orderService;
    private final AuditEventService auditEventService;
    private final EmailService emailService;
    private final EmailTemplateService emailTemplateService;

    @Transactional
    public OrderResponse submitProof(UUID orderId, UUID workerId, String completionNotes,
                                     List<MultipartFile> files, List<String> labels,
                                     JwtPrincipal principal) {
        long start = System.currentTimeMillis();

        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.ACCEPTED) {
            throw new IllegalStateException("Order must have status ACCEPTED to submit completion proof. Current: " + order.getStatus());
        }
        if (!order.getWorkerId().equals(workerId)) {
            throw new IllegalArgumentException("Order is not assigned to you");
        }

        if (proofRepository.existsByOrderId(orderId)) {
            throw new IllegalStateException("Completion proof already submitted.");
        }

        String notes = completionNotes != null ? completionNotes.trim() : "";
        if (notes.length() < 10) {
            throw new IllegalArgumentException("Completion notes must be at least 10 characters");
        }

        List<MultipartFile> validFiles = files != null ? files.stream().filter(f -> f != null && !f.isEmpty()).toList() : List.of();
        if (validFiles.size() > storageProperties.getMaxFilesPerProof()) {
            throw new IllegalArgumentException("Maximum " + storageProperties.getMaxFilesPerProof() + " files allowed per proof");
        }

        OrderCompletionProof proof = OrderCompletionProof.builder()
            .orderId(orderId)
            .workerId(workerId)
            .completionNotes(notes)
            .build();
        proof = proofRepository.save(proof);

        List<String> labelList = labels != null ? labels : List.of();
        for (int i = 0; i < validFiles.size(); i++) {
            MultipartFile file = validFiles.get(i);
            String label = i < labelList.size() && isValidLabel(labelList.get(i)) ? labelList.get(i) : null;
            String relativePath;
            try {
                relativePath = fileStorage.store(orderId, file);
            } catch (IOException e) {
                throw new IllegalStateException("Failed to store file: " + e.getMessage());
            }
            String publicUrl = fileStorage.buildPublicUrl(relativePath);

            OrderCompletionAttachment att = OrderCompletionAttachment.builder()
                .proof(proof)
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "image")
                .contentType(file.getContentType())
                .fileSizeBytes(file.getSize())
                .storagePath(relativePath)
                .publicUrl(publicUrl)
                .label(label)
                .build();
            proof.getAttachments().add(att);
        }
        proofRepository.save(proof);

        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.COMPLETED);
        orderRepository.save(order);
        historyRepository.save(OrderStatusHistory.builder()
            .orderId(orderId)
            .fromStatus(from.name())
            .toStatus(OrderStatus.COMPLETED.name())
            .actorRole(principal.role().name())
            .actorId(principal.id())
            .reason("Completion proof submitted")
            .build());

        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("CREATE", "OrderCompletionProof",
            "orderId=" + orderId + ",attachments=" + proof.getAttachments().size(),
            principal.role().name(), principal.id().toString(), dur);
        AuditLogging.logWithActor("UPDATE", "Order", "id=" + orderId + ",status=COMPLETED",
            principal.role().name(), principal.id().toString(), 0);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.ORDER_COMPLETE_WITH_PROOF, "ORDER", orderId.toString(),
            "Completion proof submitted", java.util.Map.of("orderId", orderId.toString(), "attachments", proof.getAttachments().size()), (int) dur);

        // Send notification email to the user: order completed with rating & complaint links
        try {
            String subject = "Your Service Is Complete! — Order #" + orderId.toString().substring(0, 8);
            String htmlBody = emailTemplateService.buildOrderCompletedEmail(order);
            emailService.sendEmail(subject, htmlBody);
        } catch (Exception e) {
            log.warn("Failed to send order completion email for order {}: {}", orderId, e.getMessage());
        }

        return orderService.toResponse(order);
    }

    @Transactional(readOnly = true)
    public Optional<CompletionProofDTO> getProofForOrder(UUID orderId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (!orderService.canUserAccessOrder(order, principal)) {
            return Optional.empty();
        }

        Optional<OrderCompletionProof> opt = proofRepository.findByOrderIdWithAttachments(orderId);
        CompletionProofDTO dto = opt.map(this::toDTO).orElse(null);
        AuditLogging.logRead("OrderCompletionProof", "orderId=" + orderId,
            "found=" + (dto != null), System.currentTimeMillis() - start);
        return Optional.ofNullable(dto);
    }

    public boolean proofExists(UUID orderId) {
        return proofRepository.existsByOrderId(orderId);
    }

    private CompletionProofDTO toDTO(OrderCompletionProof proof) {
        List<CompletionProofDTO.AttachmentDTO> atts = proof.getAttachments().stream()
            .map(a -> CompletionProofDTO.AttachmentDTO.builder()
                .publicUrl(a.getPublicUrl())
                .label(a.getLabel())
                .contentType(a.getContentType())
                .fileName(a.getFileName())
                .fileSizeBytes(a.getFileSizeBytes())
                .createdAt(a.getCreatedAt())
                .build())
            .toList();
        return CompletionProofDTO.builder()
            .orderId(proof.getOrderId())
            .completionNotes(proof.getCompletionNotes())
            .attachments(atts)
            .createdAt(proof.getCreatedAt())
            .build();
    }

    private boolean isValidLabel(String label) {
        return "BEFORE".equals(label) || "AFTER".equals(label);
    }
}
