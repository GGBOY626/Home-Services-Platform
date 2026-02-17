package com.homeservices.service;

import com.homeservices.config.StorageProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class LocalFileStorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalFileStorageService.class);

    private final StorageProperties storageProperties;

    public LocalFileStorageService(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    /**
     * Resolves storage root to absolute path (avoids Tomcat temp dir when using relative paths).
     * Caller should use ensureStorageRootExists() before writing if the root might not exist yet.
     */
    private Path getStorageRoot() {
        Path root = Paths.get(storageProperties.getLocalRoot());
        if (!root.isAbsolute()) {
            root = Paths.get(System.getProperty("user.dir")).resolve(root);
        }
        return root.toAbsolutePath().normalize();
    }

    /** Ensures storage root exists (e.g. in Docker the entrypoint chowns /data/uploads so this can succeed). */
    private void ensureStorageRootExists(Path root) throws IOException {
        if (Files.exists(root)) return;
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new IOException("Cannot create storage root " + root + " (check directory exists and process has write permission): " + e.getMessage(), e);
        }
    }

    /**
     * Stores a file under uploads/orders/{orderId}/{uuid}_{originalName}.
     * Sanitizes filename to prevent path traversal.
     */
    public String store(UUID orderId, MultipartFile file) throws IOException {
        validateFile(file);

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            originalName = "image";
        }
        String sanitized = sanitizeFilename(originalName);
        String storedName = UUID.randomUUID().toString() + "_" + sanitized;

        Path root = getStorageRoot();
        ensureStorageRootExists(root);
        Path baseDir = root.resolve("orders").resolve(orderId.toString());
        Files.createDirectories(baseDir);

        Path targetPath = baseDir.resolve(storedName).normalize();
        file.transferTo(targetPath.toFile());

        String relativePath = "orders/" + orderId + "/" + storedName;
        log.debug("Stored file: {}", relativePath);
        return relativePath;
    }

    /**
     * Stores a file under uploads/complaints/{ticketId}/{uuid}_{originalName}.
     * Used for complaint attachments (images only).
     */
    public String storeComplaintAttachment(Long ticketId, MultipartFile file) throws IOException {
        validateFile(file);
        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) originalName = "image";
        String sanitized = sanitizeFilename(originalName);
        String storedName = UUID.randomUUID().toString() + "_" + sanitized;
        Path root = getStorageRoot();
        ensureStorageRootExists(root);
        Path baseDir = root.resolve("complaints").resolve(String.valueOf(ticketId));
        Files.createDirectories(baseDir);
        Path targetPath = baseDir.resolve(storedName).normalize();
        file.transferTo(targetPath.toFile());
        String relativePath = "complaints/" + ticketId + "/" + storedName;
        log.debug("Stored complaint file: {}", relativePath);
        return relativePath;
    }

    public Path resolvePath(String relativePath) {
        Path root = getStorageRoot();
        Path resolved = root.resolve(relativePath).normalize();
        if (!resolved.startsWith(root)) {
            throw new SecurityException("Path traversal attempt blocked");
        }
        return resolved;
    }

    public String buildPublicUrl(String relativePath) {
        String base = storageProperties.getPublicBaseUrl().replaceAll("/$", "");
        return base + "/files/" + relativePath.replace("\\", "/");
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        long maxBytes = storageProperties.getMaxFileSizeBytes();
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("File size exceeds " + storageProperties.getMaxFileSizeMb() + " MB limit");
        }
        String contentType = file.getContentType();
        if (contentType == null || !storageProperties.getAllowedContentTypes().contains(contentType)) {
            throw new IllegalArgumentException("Content type not allowed. Allowed: " + storageProperties.getAllowedContentTypes());
        }
    }

    private String sanitizeFilename(String name) {
        String base = name.replace("..", "_").replace("/", "_").replace("\\", "_");
        base = base.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (base.length() > 100) base = base.substring(0, 100);
        return base.isEmpty() ? "file" : base;
    }
}
