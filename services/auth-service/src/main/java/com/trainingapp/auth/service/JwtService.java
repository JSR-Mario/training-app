package com.trainingapp.auth.service;

import com.trainingapp.auth.domain.User;

import com.trainingapp.auth.config.AuthConstants;
import com.trainingapp.auth.config.JwtProperties;
import com.trainingapp.auth.exception.InvalidTokenException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Service responsible for generating and validating JWT tokens.
 *
 * <p>Both access and refresh tokens are signed with the same HMAC-SHA256 key.
 * They are distinguished by the {@link AuthConstants#TOKEN_TYPE_CLAIM} claim:
 * access tokens carry {@code "access"}, refresh tokens carry {@code "refresh"}.
 *
 * <p>The signing key is derived from the {@code app.jwt.secret} property, which
 * must be a 32-byte (64-character) hex string.
 */
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final JwtProperties jwtProperties;

    /**
     * Constructs a {@code JwtService} and derives the HMAC-SHA256 signing key
     * from the configured hex secret.
     *
     * @param jwtProperties bound JWT configuration properties
     */
    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        byte[] keyBytes = HexFormat.of().parseHex(jwtProperties.secret());
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }


    /**
     * Generates a short-lived JWT access token for the given user.
     *
     * @param user the user entity
     * @return a signed, compact JWT string
     */
    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(jwtProperties.accessExpiryMinutes() * 60);
        return buildToken(user.getId(), user.getRole().name(), AuthConstants.TOKEN_TYPE_ACCESS, now, expiry);
    }


    /**
     * Generates a long-lived JWT refresh token for the given user.
     *
     * @param user the user entity
     * @return a signed, compact JWT string
     */
    public String generateRefreshToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(jwtProperties.refreshExpiryDays() * 86400);
        return buildToken(user.getId(), user.getRole().name(), AuthConstants.TOKEN_TYPE_REFRESH, now, expiry);
    }

    /**
     * Extracts and returns the user ID from a valid token.
     *
     * @param token the JWT string to parse
     * @return the UUID stored as the token subject
     * @throws InvalidTokenException if the token is invalid or expired
     */
    public UUID extractUserId(String token) {
        return UUID.fromString(parseClaims(token).getSubject());
    }

    /**
     * Returns {@code true} if the token is well-formed, correctly signed,
     * and has not yet expired.
     *
     * @param token the JWT string to validate
     * @return {@code true} if valid
     */
    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (InvalidTokenException e) {
            return false;
        }
    }

    /**
     * Returns {@code true} if the token carries the {@code "refresh"} type claim.
     *
     * @param token the JWT string to inspect
     * @return {@code true} if this is a refresh token
     * @throws InvalidTokenException if the token cannot be parsed
     */
    public boolean isRefreshToken(String token) {
        String type = (String) parseClaims(token).get(AuthConstants.TOKEN_TYPE_CLAIM);
        return AuthConstants.TOKEN_TYPE_REFRESH.equals(type);
    }

    /**
     * Returns the access token lifetime in seconds (for use in the response body).
     *
     * @return access token lifetime in seconds
     */
    public long accessExpirySeconds() {
        return jwtProperties.accessExpiryMinutes() * 60;
    }

    // ----------------------------------------------------------------
    // Private helpers
    // ----------------------------------------------------------------

    private String buildToken(UUID userId, String role, String type, Instant issuedAt, Instant expiry) {
        return Jwts.builder()
                .subject(userId.toString())
                .claim(AuthConstants.TOKEN_TYPE_CLAIM, type)
                .claim("role", role)
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiry))
                .signWith(signingKey)
                .compact();
    }

    private Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            throw new InvalidTokenException("Token has expired.");
        } catch (JwtException | IllegalArgumentException e) {
            throw new InvalidTokenException("Token is invalid.");
        }
    }
}
