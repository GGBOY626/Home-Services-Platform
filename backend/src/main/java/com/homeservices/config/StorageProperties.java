package com.homeservices.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "app.storage")
public class StorageProperties {

    private String localRoot = "./uploads";
    private String publicBaseUrl = "http://localhost:8080";
    private int maxFileSizeMb = 10;
    private int maxFilesPerProof = 6;
    private int maxComplaintAttachments = 4;
    private List<String> allowedContentTypes = List.of("image/jpeg", "image/png", "image/webp");

    public String getLocalRoot() {
        return localRoot;
    }

    public void setLocalRoot(String localRoot) {
        this.localRoot = localRoot;
    }

    public String getPublicBaseUrl() {
        return publicBaseUrl;
    }

    public void setPublicBaseUrl(String publicBaseUrl) {
        this.publicBaseUrl = publicBaseUrl;
    }

    public int getMaxFileSizeMb() {
        return maxFileSizeMb;
    }

    public void setMaxFileSizeMb(int maxFileSizeMb) {
        this.maxFileSizeMb = maxFileSizeMb;
    }

    public int getMaxFilesPerProof() {
        return maxFilesPerProof;
    }

    public void setMaxFilesPerProof(int maxFilesPerProof) {
        this.maxFilesPerProof = maxFilesPerProof;
    }

    public int getMaxComplaintAttachments() {
        return maxComplaintAttachments;
    }

    public void setMaxComplaintAttachments(int maxComplaintAttachments) {
        this.maxComplaintAttachments = maxComplaintAttachments;
    }

    public List<String> getAllowedContentTypes() {
        return allowedContentTypes;
    }

    public void setAllowedContentTypes(List<String> allowedContentTypes) {
        this.allowedContentTypes = allowedContentTypes;
    }

    public long getMaxFileSizeBytes() {
        return maxFileSizeMb * 1024L * 1024L;
    }
}
