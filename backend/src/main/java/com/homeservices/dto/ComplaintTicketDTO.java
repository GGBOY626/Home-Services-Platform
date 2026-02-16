package com.homeservices.dto;

import com.homeservices.domain.ComplaintCategory;
import com.homeservices.domain.ComplaintStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ComplaintTicketDTO {

    private Long id;
    private UUID orderId;
    private UUID userId;
    private UUID merchantId;
    private ComplaintStatus status;
    private ComplaintCategory category;
    private String subject;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant resolvedAt;
    private Instant closedAt;
    private List<ComplaintMessageDTO> messages;
    private List<ComplaintAttachmentDTO> attachments;
}
