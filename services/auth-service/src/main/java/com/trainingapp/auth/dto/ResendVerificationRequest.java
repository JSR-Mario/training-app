package com.trainingapp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for re-sending an email verification link.
 */
public record ResendVerificationRequest(
        @NotBlank(message = "Email address must not be blank")
        @Email(message = "Email must be a valid email address")
        String email
) {}
