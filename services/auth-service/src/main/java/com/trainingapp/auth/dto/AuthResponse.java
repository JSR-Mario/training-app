package com.trainingapp.auth.dto;

/**
 * Response body returned by {@code POST /api/v1/auth/login} and
 * {@code POST /api/v1/auth/refresh}.
 *
 * <p>The access token is returned here in the response body. The refresh token
 * is set as an HttpOnly cookie by the controller and never appears in this record.
 *
 * @param accessToken  a signed JWT access token
 * @param tokenType    always {@code "Bearer"}
 * @param expiresIn    lifetime of the access token in seconds
 */
public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn
) {}
