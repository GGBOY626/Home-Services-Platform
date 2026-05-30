package com.homeservices.controller;

import com.homeservices.domain.UserAccount;
import com.homeservices.dto.UpdateUserProfileRequest;
import com.homeservices.dto.UserProfileDTO;
import com.homeservices.repository.UserAccountRepository;
import com.homeservices.security.JwtPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user/profile")
@RequiredArgsConstructor
@Tag(name = "User Profile", description = "Customer profile and default address management")
public class UserProfileController {

    private final UserAccountRepository userAccountRepository;

    @GetMapping
    @Operation(summary = "Get current user profile")
    public ResponseEntity<UserProfileDTO> get(@AuthenticationPrincipal JwtPrincipal principal) {
        UserAccount account = userAccountRepository.findById(principal.id())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return ResponseEntity.ok(toDTO(account));
    }

    @PatchMapping
    @Operation(summary = "Update home address")
    public ResponseEntity<UserProfileDTO> update(
            @RequestBody UpdateUserProfileRequest request,
            @AuthenticationPrincipal JwtPrincipal principal) {
        UserAccount account = userAccountRepository.findById(principal.id())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        account.setHomeAddress(request.getHomeAddress());
        account.setHomeLat(request.getHomeLat());
        account.setHomeLng(request.getHomeLng());
        account = userAccountRepository.save(account);
        return ResponseEntity.ok(toDTO(account));
    }

    private UserProfileDTO toDTO(UserAccount account) {
        return UserProfileDTO.builder()
            .email(account.getEmail())
            .homeAddress(account.getHomeAddress())
            .homeLat(account.getHomeLat())
            .homeLng(account.getHomeLng())
            .build();
    }
}
