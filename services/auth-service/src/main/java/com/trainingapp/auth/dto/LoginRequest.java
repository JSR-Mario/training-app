package com.trainingapp.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for {@code POST /api/v1/auth/login}.
 *
 * @param username the account's login name
 * @param password the plain-text password to verify against the stored hash
 */
public record LoginRequest(
        @NotBlank String username,
        @NotBlank String password
) {}
