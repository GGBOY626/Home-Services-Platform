package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class CompletionProofDTO {

    private UUID orderId;
    private String completionNotes;
    private List<AttachmentDTO> attachments;
    private Instant createdAt;

    @Data
    @Builder
    public static class AttachmentDTO {
        private String publicUrl;
        private String label;
        private String contentType;
        private String fileName;
        private Long fileSizeBytes;
        private Instant createdAt;
    }
}
