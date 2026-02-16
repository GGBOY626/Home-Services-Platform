package com.homeservices.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ComplaintAttachmentDTO {

    private Long id;
    private String fileName;
    private String contentType;
    private Long fileSizeBytes;
    private String publicUrl;
    private Instant createdAt;
}
