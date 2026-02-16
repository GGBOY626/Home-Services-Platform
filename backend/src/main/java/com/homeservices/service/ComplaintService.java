package com.homeservices.service;

import com.homeservices.config.AuditActions;
import com.homeservices.config.AuditLogging;
import com.homeservices.config.StorageProperties;
import com.homeservices.domain.*;
import com.homeservices.dto.*;
import com.homeservices.repository.ComplaintTicketRepository;
import com.homeservices.repository.MerchantProfileRepository;
import com.homeservices.repository.OrderRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ComplaintService {

    private static final int MAX_DESCRIPTION_LENGTH = 4000;
    private static final int MAX_SUBJECT_LENGTH = 200;

    private final OrderRepository orderRepository;
    private final ComplaintTicketRepository complaintRepository;
    private final MerchantProfileRepository merchantProfileRepository;
    private final LocalFileStorageService fileStorage;
    private final StorageProperties storageProperties;
    private final AuditEventService auditEventService;

    @Transactional
    public ComplaintTicketDTO create(UUID orderId, UUID userId, String subject, ComplaintCategory category,
                                     String description, List<MultipartFile> files, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        if (!order.getCreatedBy().equals(userId)) {
            throw new IllegalArgumentException("Order does not belong to you");
        }
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.EXPIRED) {
            throw new IllegalStateException("Cannot create complaint for cancelled or expired order");
        }
        if (order.getStatus() != OrderStatus.ACCEPTED && order.getStatus() != OrderStatus.COMPLETED && order.getStatus() != OrderStatus.CLOSED) {
            throw new IllegalStateException("Complaint can only be created for orders in ACCEPTED, COMPLETED or CLOSED status");
        }
        if (complaintRepository.existsByOrderIdAndUserId(orderId, userId)) {
            throw new IllegalStateException("A complaint already exists for this order");
        }

        String subj = subject != null ? subject.trim() : "";
        if (subj.isEmpty()) throw new IllegalArgumentException("Subject is required");
        if (subj.length() > MAX_SUBJECT_LENGTH) throw new IllegalArgumentException("Subject must be at most " + MAX_SUBJECT_LENGTH + " characters");

        String desc = description != null ? description.trim() : "";
        if (desc.isEmpty()) throw new IllegalArgumentException("Description is required");
        if (desc.length() > MAX_DESCRIPTION_LENGTH) throw new IllegalArgumentException("Description must be at most " + MAX_DESCRIPTION_LENGTH + " characters");

        List<MultipartFile> validFiles = files != null ? files.stream().filter(f -> f != null && !f.isEmpty()).toList() : List.of();
        if (validFiles.size() > storageProperties.getMaxComplaintAttachments()) {
            throw new IllegalArgumentException("Maximum " + storageProperties.getMaxComplaintAttachments() + " images allowed per complaint");
        }

        ComplaintTicket ticket = ComplaintTicket.builder()
            .orderId(orderId)
            .userId(userId)
            .merchantId(order.getMerchantId())
            .status(ComplaintStatus.OPEN)
            .category(category)
            .subject(subj)
            .description(desc)
            .build();
        ticket = complaintRepository.save(ticket);

        ComplaintMessage initial = ComplaintMessage.builder()
            .ticket(ticket)
            .actorRole(principal.role().name())
            .actorId(principal.id())
            .message(desc)
            .build();
        ticket.getMessages().add(initial);

        for (MultipartFile file : validFiles) {
            String relativePath;
            try {
                relativePath = fileStorage.storeComplaintAttachment(ticket.getId(), file);
            } catch (IOException e) {
                throw new IllegalStateException("Failed to store file: " + e.getMessage());
            }
            String publicUrl = fileStorage.buildPublicUrl(relativePath);
            ComplaintAttachment att = ComplaintAttachment.builder()
                .ticket(ticket)
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "image")
                .contentType(file.getContentType())
                .fileSizeBytes(file.getSize())
                .storagePath(relativePath)
                .publicUrl(publicUrl)
                .build();
            ticket.getAttachments().add(att);
        }
        complaintRepository.save(ticket);

        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("CREATE", "ComplaintTicket",
            "id=" + ticket.getId() + ",orderId=" + orderId + ",attachments=" + ticket.getAttachments().size(),
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.COMPLAINT_CREATE, "COMPLAINT", ticket.getId().toString(),
            "Complaint created", java.util.Map.of("orderId", orderId.toString(), "ticketId", ticket.getId()), (int) dur);
        return toDTO(ticket);
    }

    @Transactional(readOnly = true)
    public Page<ComplaintTicketDTO> listForUser(UUID userId, ComplaintStatus status, Instant from, Instant to, Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Page<ComplaintTicket> page = complaintRepository.findByUserFiltered(userId, status, from, to, pageable);
        AuditLogging.logRead("ComplaintTicket", "userId=" + userId,
            "page=" + page.getNumber() + ",size=" + page.getSize(), System.currentTimeMillis() - start);
        return page.map(this::toSummaryDTO);
    }

    private ComplaintTicketDTO toSummaryDTO(ComplaintTicket t) {
        return ComplaintTicketDTO.builder()
            .id(t.getId())
            .orderId(t.getOrderId())
            .userId(t.getUserId())
            .merchantId(t.getMerchantId())
            .status(t.getStatus())
            .category(t.getCategory())
            .subject(t.getSubject())
            .description(t.getDescription())
            .createdAt(t.getCreatedAt())
            .updatedAt(t.getUpdatedAt())
            .resolvedAt(t.getResolvedAt())
            .closedAt(t.getClosedAt())
            .messages(null)
            .attachments(null)
            .build();
    }

    @Transactional(readOnly = true)
    public Optional<ComplaintTicketDTO> getForUser(Long id, UUID userId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Optional<ComplaintTicket> opt = complaintRepository.findById(id);
        if (opt.isEmpty() || !opt.get().getUserId().equals(userId)) {
            AuditLogging.logRead("ComplaintTicket", "id=" + id, "found=false", System.currentTimeMillis() - start);
            return Optional.empty();
        }
        AuditLogging.logRead("ComplaintTicket", "id=" + id, "found=true", System.currentTimeMillis() - start);
        return Optional.of(toDTO(opt.get()));
    }

    @Transactional
    public Optional<ComplaintTicketDTO> closeByUser(Long id, UUID userId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        ComplaintTicket ticket = complaintRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Complaint not found: " + id));
        if (!ticket.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Complaint does not belong to you");
        }
        if (ticket.getStatus() != ComplaintStatus.OPEN && ticket.getStatus() != ComplaintStatus.IN_REVIEW) {
            throw new IllegalStateException("Only OPEN or IN_REVIEW complaints can be withdrawn. Current: " + ticket.getStatus());
        }
        ticket.setStatus(ComplaintStatus.CLOSED);
        ticket.setClosedAt(Instant.now());
        complaintRepository.save(ticket);
        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("UPDATE", "ComplaintTicket", "id=" + id + ",status=CLOSED",
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.COMPLAINT_STATUS_CHANGE, "COMPLAINT", id.toString(),
            "Complaint closed by user", java.util.Map.of("fromStatus", "OPEN/IN_REVIEW", "toStatus", "CLOSED"), (int) dur);
        return Optional.of(toSummaryDTO(ticket));
    }

    @Transactional(readOnly = true)
    public Page<ComplaintTicketDTO> listForMerchant(UUID merchantId, ComplaintStatus status, Instant from, Instant to, Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Page<ComplaintTicket> page = complaintRepository.findByMerchantFiltered(merchantId, status, from, to, pageable);
        AuditLogging.logRead("ComplaintTicket", "merchantId=" + merchantId,
            "page=" + page.getNumber() + ",size=" + page.getSize(), System.currentTimeMillis() - start);
        return page.map(this::toSummaryDTO);
    }

    @Transactional(readOnly = true)
    public Optional<ComplaintTicketDTO> getForMerchant(Long id, UUID merchantId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Optional<ComplaintTicket> opt = complaintRepository.findById(id);
        if (opt.isEmpty() || !opt.get().getMerchantId().equals(merchantId)) {
            AuditLogging.logRead("ComplaintTicket", "id=" + id + ",merchantId=" + merchantId, "found=false", System.currentTimeMillis() - start);
            return Optional.empty();
        }
        AuditLogging.logRead("ComplaintTicket", "id=" + id, "found=true", System.currentTimeMillis() - start);
        return Optional.of(toDTO(opt.get()));
    }

    @Transactional
    public Optional<ComplaintTicketDTO> addMerchantMessage(Long id, UUID merchantId, String message, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        ComplaintTicket ticket = complaintRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Complaint not found: " + id));
        if (!ticket.getMerchantId().equals(merchantId)) {
            throw new IllegalArgumentException("Complaint is not assigned to your merchant");
        }
        String msg = message != null ? message.trim() : "";
        if (msg.isEmpty()) throw new IllegalArgumentException("Message is required");
        ComplaintMessage m = ComplaintMessage.builder()
            .ticket(ticket)
            .actorRole(principal.role().name())
            .actorId(principal.id())
            .message(msg)
            .build();
        ticket.getMessages().add(m);
        complaintRepository.save(ticket);
        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("CREATE", "ComplaintMessage", "ticketId=" + id,
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.COMPLAINT_MESSAGE, "COMPLAINT", id.toString(),
            "Complaint message added", java.util.Map.of("ticketId", id), (int) dur);
        return complaintRepository.findById(id).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public Page<ComplaintTicketDTO> listForAdmin(ComplaintStatus status, ComplaintCategory category, UUID merchantId, Instant from, Instant to, Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Page<ComplaintTicket> page = complaintRepository.findAdminFiltered(status, category, merchantId, from, to, pageable);
        AuditLogging.logRead("ComplaintTicket", "admin status=" + status + ",category=" + category + ",merchantId=" + merchantId,
            "page=" + page.getNumber() + ",size=" + page.getSize(), System.currentTimeMillis() - start);
        return page.map(this::toSummaryDTO);
    }

    @Transactional(readOnly = true)
    public Optional<ComplaintTicketDTO> getForAdmin(Long id, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Optional<ComplaintTicket> opt = complaintRepository.findById(id);
        AuditLogging.logRead("ComplaintTicket", "id=" + id, "found=" + opt.isPresent(), System.currentTimeMillis() - start);
        return opt.map(this::toDTO);
    }

    @Transactional
    public ComplaintTicketDTO updateStatusByAdmin(Long id, ComplaintStatus newStatus, String note, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        ComplaintTicket ticket = complaintRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Complaint not found: " + id));

        ComplaintStatus current = ticket.getStatus();
        if (!isAllowedAdminTransition(current, newStatus)) {
            throw new IllegalStateException("Invalid status transition from " + current + " to " + newStatus + ". Allowed: OPEN->IN_REVIEW; IN_REVIEW->RESOLVED|REJECTED; RESOLVED|REJECTED->CLOSED.");
        }

        ticket.setStatus(newStatus);
        if (newStatus == ComplaintStatus.RESOLVED) {
            ticket.setResolvedAt(Instant.now());
        }
        if (newStatus == ComplaintStatus.CLOSED || newStatus == ComplaintStatus.REJECTED) {
            if (ticket.getClosedAt() == null) ticket.setClosedAt(Instant.now());
        }

        if (note != null && !note.trim().isEmpty()) {
            ComplaintMessage m = ComplaintMessage.builder()
                .ticket(ticket)
                .actorRole(principal.role().name())
                .actorId(principal.id())
                .message(note.trim())
                .build();
            ticket.getMessages().add(m);
        }
        complaintRepository.save(ticket);

        long dur = System.currentTimeMillis() - start;
        AuditLogging.logWithActor("UPDATE", "ComplaintTicket", "id=" + id + ",status=" + current + "->" + newStatus,
            principal.role().name(), principal.id().toString(), dur);
        auditEventService.recordWithContext(principal.role().name(), principal.id().toString(), AuditActions.COMPLAINT_STATUS_CHANGE, "COMPLAINT", id.toString(),
            "Complaint status changed", java.util.Map.of("fromStatus", current.name(), "toStatus", newStatus.name()), (int) dur);
        return toDTO(ticket);
    }

    private static boolean isAllowedAdminTransition(ComplaintStatus from, ComplaintStatus to) {
        return switch (from) {
            case OPEN -> to == ComplaintStatus.IN_REVIEW;
            case IN_REVIEW -> to == ComplaintStatus.RESOLVED || to == ComplaintStatus.REJECTED;
            case RESOLVED, REJECTED -> to == ComplaintStatus.CLOSED;
            case CLOSED -> false;
        };
    }

    private ComplaintTicketDTO toDTO(ComplaintTicket t) {
        List<ComplaintMessageDTO> msgs = t.getMessages().stream()
            .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
            .map(m -> ComplaintMessageDTO.builder()
                .id(m.getId())
                .actorRole(m.getActorRole())
                .actorId(m.getActorId())
                .message(m.getMessage())
                .createdAt(m.getCreatedAt())
                .build())
            .toList();
        List<ComplaintAttachmentDTO> atts = (t.getAttachments() != null ? t.getAttachments() : new ArrayList<ComplaintAttachment>()).stream()
            .map(a -> ComplaintAttachmentDTO.builder()
                .id(a.getId())
                .fileName(a.getFileName())
                .contentType(a.getContentType())
                .fileSizeBytes(a.getFileSizeBytes())
                .publicUrl(a.getPublicUrl())
                .createdAt(a.getCreatedAt())
                .build())
            .toList();
        return ComplaintTicketDTO.builder()
            .id(t.getId())
            .orderId(t.getOrderId())
            .userId(t.getUserId())
            .merchantId(t.getMerchantId())
            .status(t.getStatus())
            .category(t.getCategory())
            .subject(t.getSubject())
            .description(t.getDescription())
            .createdAt(t.getCreatedAt())
            .updatedAt(t.getUpdatedAt())
            .resolvedAt(t.getResolvedAt())
            .closedAt(t.getClosedAt())
            .messages(msgs)
            .attachments(atts)
            .build();
    }
}
