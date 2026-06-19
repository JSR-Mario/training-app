package com.trainingapp.auth.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Strongly-typed binding for the {@code app.jwt.*} configuration namespace.
 *
 * <p>Bound automatically by Spring Boot's {@code @ConfigurationProperties} mechanism.
 * Validated at startup — the application refuses to start if any required value
 * is missing or invalid.
 *
 * <p>All values are read from environment variables (see {@code application.yml}).
 * No default for {@code secret} — it must always be set explicitly.
 *
 * @param secret             256-bit hex string used to sign and verify JWTs
 * @param accessExpiryMinutes lifetime of an access token in minutes (default 15)
 * @param refreshExpiryDays  lifetime of a refresh token in days (default 7)
 * @param cookieSecure       whether the refresh-token cookie is Secure-flagged;
 *                           set to {@code true} in any HTTPS environment
 */
@Validated
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        @NotBlank String secret,
        @Positive long accessExpiryMinutes,
        @Positive long refreshExpiryDays,
        boolean cookieSecure
) {}
