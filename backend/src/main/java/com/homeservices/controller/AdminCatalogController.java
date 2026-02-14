package com.homeservices.controller;

import com.homeservices.dto.*;
import com.homeservices.service.CatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/catalog")
@RequiredArgsConstructor
@Tag(name = "Admin Catalog", description = "Catalog CRUD for admin")
public class AdminCatalogController {

    private final CatalogService catalogService;

    @GetMapping("/categories")
    @Operation(summary = "List all categories")
    public ResponseEntity<List<ServiceCategoryDTO>> getCategories() {
        return ResponseEntity.ok(catalogService.getCategoriesForAdmin());
    }

    @PostMapping("/categories")
    @Operation(summary = "Create category")
    public ResponseEntity<ServiceCategoryDTO> createCategory(@Valid @RequestBody CreateCategoryRequest request) {
        return ResponseEntity.ok(catalogService.createCategory(request));
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Update category")
    public ResponseEntity<ServiceCategoryDTO> updateCategory(@PathVariable Long id,
                                                              @Valid @RequestBody UpdateCategoryRequest request) {
        return ResponseEntity.ok(catalogService.updateCategory(id, request));
    }

    @GetMapping("/items")
    @Operation(summary = "List all service items")
    public ResponseEntity<List<ServiceItemDTO>> getItems() {
        return ResponseEntity.ok(catalogService.getItemsForAdmin());
    }

    @PostMapping("/items")
    @Operation(summary = "Create service item")
    public ResponseEntity<ServiceItemDTO> createItem(@Valid @RequestBody CreateServiceItemRequest request) {
        return ResponseEntity.ok(catalogService.createItem(request));
    }

    @PutMapping("/items/{id}")
    @Operation(summary = "Update service item")
    public ResponseEntity<ServiceItemDTO> updateItem(@PathVariable Long id,
                                                     @Valid @RequestBody UpdateServiceItemRequest request) {
        return ResponseEntity.ok(catalogService.updateItem(id, request));
    }
}
