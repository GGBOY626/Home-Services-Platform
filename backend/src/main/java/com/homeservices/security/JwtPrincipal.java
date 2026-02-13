package com.homeservices.security;

import com.homeservices.domain.Role;

import java.util.UUID;

public record JwtPrincipal(UUID id, String email, Role role) {}
