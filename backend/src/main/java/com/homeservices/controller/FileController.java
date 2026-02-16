package com.homeservices.controller;

import com.homeservices.service.LocalFileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/files")
public class FileController {

    private static final Logger log = LoggerFactory.getLogger(FileController.class);

    private final LocalFileStorageService fileStorage;

    public FileController(LocalFileStorageService fileStorage) {
        this.fileStorage = fileStorage;
    }

    /**
     * Serves files from local storage. Path: /files/orders/{orderId}/{filename}.
     * Prevents directory traversal via LocalFileStorageService.resolvePath.
     */
    @GetMapping("/orders/{orderId}/{filename}")
    public ResponseEntity<Resource> serveFile(@PathVariable String orderId, @PathVariable String filename) {
        String relativePath = "orders/" + orderId + "/" + filename;
        try {
            Path path = fileStorage.resolvePath(relativePath);
            if (!Files.exists(path) || !Files.isRegularFile(path)) {
                return ResponseEntity.notFound().build();
            }
            Resource res = new UrlResource(path.toUri());
            String contentType = Files.probeContentType(path);
            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType != null ? contentType : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(res);
        } catch (Exception e) {
            log.warn("File not found or error: {}", relativePath);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Serves complaint attachment files. Path: /files/complaints/{ticketId}/{filename}.
     */
    @GetMapping("/complaints/{ticketId}/{filename}")
    public ResponseEntity<Resource> serveComplaintFile(@PathVariable Long ticketId, @PathVariable String filename) {
        String relativePath = "complaints/" + ticketId + "/" + filename;
        try {
            Path path = fileStorage.resolvePath(relativePath);
            if (!Files.exists(path) || !Files.isRegularFile(path)) {
                return ResponseEntity.notFound().build();
            }
            Resource res = new UrlResource(path.toUri());
            String contentType = Files.probeContentType(path);
            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType != null ? contentType : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(res);
        } catch (Exception e) {
            log.warn("Complaint file not found or error: {}", relativePath);
            return ResponseEntity.notFound().build();
        }
    }
}
