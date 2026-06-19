package com.trainingapp.auth.controller;

import com.trainingapp.auth.config.AuthConstants;
import com.trainingapp.auth.config.JwtProperties;
import com.trainingapp.auth.dto.AuthResponse;
import com.trainingapp.auth.dto.LoginRequest;
import com.trainingapp.auth.dto.RegisterRequest;
import com.trainingapp.auth.dto.UserResponse;
import com.trainingapp.auth.service.AuthService;
import com.trainingapp.auth.service.AuthService.LoginResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.UUID;

/**
 * REST controller exposing the five authentication endpoints.
 *
 * <p>All endpoints are public (no JWT required) except {@code GET /me},
 * which reads the {@code X-User-Id} header injected by the API gateway
 * after validating the caller's access token.
 */
@Tag(name = "Authentication", description = "Registration, login, token refresh, logout, and profile retrieval")
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtProperties jwtProperties;

    /**
     * Constructs the controller with its required dependencies.
     *
     * @param authService    the authentication business logic service
     * @param jwtProperties  JWT configuration (used for cookie attributes)
     */
    public AuthController(AuthService authService, JwtProperties jwtProperties) {
        this.authService = authService;
        this.jwtProperties = jwtProperties;
    }

    /**
     * Registers a new user account.
     *
     * @param request the registration payload
     * @return 201 Created with the new user's public profile
     */
    @Operation(summary = "Register a new user account")
    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Authenticates a user and returns an access token.
     * Sets the refresh token as an HttpOnly cookie.
     *
     * @param request  the login credentials
     * @return 200 OK with the access token; refresh token is in the Set-Cookie header
     */
    @Operation(summary = "Login and obtain an access token")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResult result = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(result.refreshToken()).toString())
                .body(result.authResponse());
    }

    /**
     * Issues a new access token using the refresh token from the HttpOnly cookie.
     *
     * @param refreshToken the refresh JWT from the {@code refresh_token} cookie
     * @return 200 OK with a new access token
     */
    @Operation(summary = "Refresh the access token using the HttpOnly refresh cookie")
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = AuthConstants.REFRESH_TOKEN_COOKIE_NAME) String refreshToken) {
        AuthResponse response = authService.refresh(refreshToken);
        return ResponseEntity.ok(response);
    }

    /**
     * Clears the refresh token cookie, effectively logging the user out.
     *
     * @return 204 No Content with an expired Set-Cookie header
     */
    @Operation(summary = "Logout — clears the refresh token cookie")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        ResponseCookie expiredCookie = ResponseCookie.from(AuthConstants.REFRESH_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(jwtProperties.cookieSecure())
                .sameSite("Strict")
                .path(AuthConstants.REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(0)
                .build();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, expiredCookie.toString())
                .build();
    }

    /**
     * Returns the profile of the currently authenticated user.
     *
     * <p>The user ID is read from the {@code X-User-Id} header, which is
     * injected by the API gateway after validating the caller's access token.
     * It is never accepted from the client body or query params.
     *
     * @param userId the authenticated user's UUID (from gateway header)
     * @return 200 OK with the user's public profile
     */
    @Operation(summary = "Get the current user's profile (requires valid access token via gateway)")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@RequestHeader("X-User-Id") UUID userId) {
        UserResponse response = authService.getUser(userId);
        return ResponseEntity.ok(response);
    }

    // ----------------------------------------------------------------
    // Private helpers
    // ----------------------------------------------------------------

    private ResponseCookie buildRefreshCookie(String refreshToken) {
        return ResponseCookie.from(AuthConstants.REFRESH_TOKEN_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(jwtProperties.cookieSecure())
                .sameSite("Strict")
                .path(AuthConstants.REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(Duration.ofDays(jwtProperties.refreshExpiryDays()))
                .build();
    }
}
