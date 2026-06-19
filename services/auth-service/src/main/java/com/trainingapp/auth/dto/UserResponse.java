package com.trainingapp.auth.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Read-only view of a {@link com.trainingapp.auth.domain.User} returned by the API.
 *
 * <p>The {@code passwordHash} field of the entity is intentionally omitted.
 *
 * @param id        surrogate primary key
 * @param username  login name
 * @param email     email address
 * @param createdAt UTC instant when the account was created
 */
public record UserResponse(
        UUID id,
        String username,
        String email,
        Instant createdAt
) {}
