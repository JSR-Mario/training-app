package com.trainingapp.auth.service;

import com.trainingapp.auth.domain.User;
import com.trainingapp.auth.dto.AuthResponse;
import com.trainingapp.auth.dto.LoginRequest;
import com.trainingapp.auth.dto.RegisterRequest;
import com.trainingapp.auth.dto.UserResponse;
import com.trainingapp.auth.exception.DuplicateResourceException;
import com.trainingapp.auth.exception.InvalidTokenException;
import com.trainingapp.auth.exception.ResourceNotFoundException;
import com.trainingapp.auth.repository.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Core authentication business logic.
 *
 * <p>Handles user registration, login credential verification, access-token
 * refresh, and profile retrieval. All interactions with the database are
 * scoped to the authenticated user — the service never returns another
 * user's data based on caller-supplied IDs (the {@code userId} on the
 * {@code /me} endpoint comes from the gateway-validated JWT, not the client).
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Constructs an {@code AuthService} with its required collaborators.
     *
     * @param userRepository  JPA repository for user persistence
     * @param jwtService      service for JWT generation and validation
     * @param passwordEncoder BCrypt encoder for password hashing and verification
     */
    public AuthService(UserRepository userRepository,
                       JwtService jwtService,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Registers a new user account.
     *
     * <p>Validates that neither the username nor the email is already taken,
     * hashes the password with BCrypt (cost 12), persists the user, and returns
     * a sanitized view of the newly created account.
     *
     * @param request the registration payload (username, email, password)
     * @return a {@link UserResponse} for the newly created user
     * @throws DuplicateResourceException if the username or email already exists
     */
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new DuplicateResourceException("Username is already taken.");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email address is already registered.");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));

        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    /**
     * Authenticates a user and returns a new pair of tokens.
     *
     * <p>The access token is included in the returned {@link AuthResponse}.
     * The refresh token is returned separately so the controller can set it
     * as an HttpOnly cookie.
     *
     * @param request the login payload (username, password)
     * @return an {@link AuthResponse} containing the access token
     * @throws BadCredentialsException if the username is not found or the
     *                                 password does not match
     */
    @Transactional(readOnly = true)
    public LoginResult login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password."));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password.");
        }

        String accessToken = jwtService.generateAccessToken(user.getId());
        String refreshToken = jwtService.generateRefreshToken(user.getId());
        AuthResponse authResponse = new AuthResponse(accessToken, "Bearer", jwtService.accessExpirySeconds());
        return new LoginResult(authResponse, refreshToken);
    }

    /**
     * Issues a new access token in exchange for a valid refresh token.
     *
     * @param refreshToken the JWT refresh token from the HttpOnly cookie
     * @return a new {@link AuthResponse} with a fresh access token
     * @throws InvalidTokenException if the token is invalid, expired, or not a refresh token
     */
    @Transactional(readOnly = true)
    public AuthResponse refresh(String refreshToken) {
        if (!jwtService.isValid(refreshToken)) {
            throw new InvalidTokenException("Refresh token is invalid or has expired.");
        }
        if (!jwtService.isRefreshToken(refreshToken)) {
            throw new InvalidTokenException("Provided token is not a refresh token.");
        }

        UUID userId = jwtService.extractUserId(refreshToken);
        String newAccessToken = jwtService.generateAccessToken(userId);
        return new AuthResponse(newAccessToken, "Bearer", jwtService.accessExpirySeconds());
    }

    /**
     * Returns the profile of the user identified by the given ID.
     *
     * <p>The {@code userId} is always sourced from the {@code X-User-Id} header
     * injected by the API gateway after JWT validation — never from the client body.
     *
     * @param userId the authenticated user's UUID
     * @return a {@link UserResponse} with the user's public profile
     * @throws ResourceNotFoundException if no user with the given ID exists
     */
    @Transactional(readOnly = true)
    public UserResponse getUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        return toResponse(user);
    }

    // ----------------------------------------------------------------
    // Private helpers
    // ----------------------------------------------------------------

    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getCreatedAt());
    }

    /**
     * Carrier for the login result — bundles the auth response with the raw
     * refresh token so the controller can set the cookie separately.
     *
     * @param authResponse the access token response body
     * @param refreshToken the raw refresh JWT string (for the HttpOnly cookie)
     */
    public record LoginResult(AuthResponse authResponse, String refreshToken) {}
}
