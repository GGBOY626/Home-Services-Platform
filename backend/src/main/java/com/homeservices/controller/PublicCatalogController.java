package com.homeservices.controller;

import com.homeservices.dto.CategoryWithItemsDTO;
import com.homeservices.dto.ServiceItemDTO;
import com.homeservices.service.CatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Tag(name = "Public Catalog", description = "Public service catalog (no auth)")
public class PublicCatalogController {

    private final CatalogService catalogService;

    @GetMapping("/categories")
    @Operation(summary = "List active categories with their active service items")
    public ResponseEntity<List<CategoryWithItemsDTO>> getCategories() {
        return ResponseEntity.ok(catalogService.getCategoriesWithItems());
    }

    @GetMapping("/services")
    @Operation(summary = "List active service items by category code")
    public ResponseEntity<List<ServiceItemDTO>> getServices(@RequestParam(required = false) String categoryCode) {
        if (categoryCode == null || categoryCode.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(catalogService.getServicesByCategoryCode(categoryCode.trim()));
    }
}
