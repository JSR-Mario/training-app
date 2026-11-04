package com.trainingapp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/v1/auth/forgot-password}.
 *
 * @param email user's registered email address
 */
public record ForgotPasswordRequest(
        @NotBlank @Email @Size(max = 255) String email
) {}
