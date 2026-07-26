package com.trainingapp.auth.service;

import com.trainingapp.auth.domain.User;
import com.trainingapp.auth.dto.AuthResponse;
import com.trainingapp.auth.dto.LoginRequest;
import com.trainingapp.auth.dto.RegisterRequest;
import com.trainingapp.auth.dto.UpdatePreferencesRequest;
import com.trainingapp.auth.dto.UserResponse;
import com.trainingapp.auth.exception.DuplicateResourceException;
import com.trainingapp.auth.exception.InvalidTokenException;
import com.trainingapp.auth.exception.ResourceNotFoundException;
import com.trainingapp.auth.repository.UserRepository;
import com.trainingapp.auth.repository.VerificationTokenRepository;
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
    private final VerificationTokenRepository verificationTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public AuthService(UserRepository userRepository,
                       VerificationTokenRepository verificationTokenRepository,
                       JwtService jwtService,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.verificationTokenRepository = verificationTokenRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    /**
     * Registers a new user account.
     *
     * <p>Validates that neither the username nor the email is already taken,
     * hashes the password with BCrypt (cost 12), persists the user with {@code emailVerified = false},
     * generates a 1-hour verification token, and sends a verification email.
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
        user.setEmailVerified(false);

        User saved = userRepository.save(user);
        createAndSendVerificationToken(saved);

        return toResponse(saved);
    }

    /**
     * Verifies a user's email address using a valid verification token.
     *
     * @param token the 64-character verification token
     */
    @Transactional
    public void verifyEmail(String token) {
        com.trainingapp.auth.domain.VerificationToken verificationToken = verificationTokenRepository.findByToken(token)
                .orElseThrow(() -> new InvalidTokenException("Invalid verification token."));

        if (verificationToken.isExpired()) {
            throw new InvalidTokenException("Verification token has expired. Please request a new one.");
        }

        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
        verificationTokenRepository.deleteByUser(user);
    }

    /**
     * Resends a verification email to the specified user address with a 60-second cooldown rate limit.
     *
     * @param email user's email address
     */
    @Transactional
    public void resendVerification(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || user.isEmailVerified()) {
            return;
        }

        java.util.Optional<com.trainingapp.auth.domain.VerificationToken> existingOpt = verificationTokenRepository.findByUser(user);
        if (existingOpt.isPresent()) {
            com.trainingapp.auth.domain.VerificationToken existing = existingOpt.get();
            if (java.time.Instant.now().isBefore(existing.getLastSentAt().plusSeconds(60))) {
                throw new com.trainingapp.auth.exception.RateLimitExceededException("Please wait 60 seconds before requesting another verification email.");
            }
            existing.setToken(java.util.UUID.randomUUID().toString().replace("-", ""));
            existing.setExpiresAt(java.time.Instant.now().plus(java.time.Duration.ofHours(1)));
            existing.setLastSentAt(java.time.Instant.now());
            verificationTokenRepository.save(existing);
            emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), existing.getToken());
        } else {
            createAndSendVerificationToken(user);
        }
    }

    private void createAndSendVerificationToken(User user) {
        com.trainingapp.auth.domain.VerificationToken token = new com.trainingapp.auth.domain.VerificationToken();
        token.setUser(user);
        token.setToken(java.util.UUID.randomUUID().toString().replace("-", ""));
        token.setExpiresAt(java.time.Instant.now().plus(java.time.Duration.ofHours(1)));
        token.setLastSentAt(java.time.Instant.now());
        verificationTokenRepository.save(token);

        emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), token.getToken());
    }

    /**
     * Authenticates a user and returns a new pair of tokens.
     *
     * @param request the login payload (username, password)
     * @return an {@link AuthResponse} containing the access token
     * @throws BadCredentialsException if authentication fails
     * @throws com.trainingapp.auth.exception.EmailNotVerifiedException if user email is not verified
     */
    @Transactional(readOnly = true)
    public LoginResult login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password."));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password.");
        }

        if (!user.isEmailVerified()) {
            throw new com.trainingapp.auth.exception.EmailNotVerifiedException("Your email address is not verified. Please verify your account before logging in.");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidTokenException("User associated with refresh token not found."));

        if (!user.isEmailVerified()) {
            throw new com.trainingapp.auth.exception.EmailNotVerifiedException("Your email address is not verified.");
        }

        String newAccessToken = jwtService.generateAccessToken(user);
        return new AuthResponse(newAccessToken, "Bearer", jwtService.accessExpirySeconds());
    }

    /**
     * Returns the profile of the user identified by the given ID.
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

    /**
     * Updates the user's theme preferences.
     *
     * @param userId  the authenticated user's UUID
     * @param request the payload containing preferences
     * @return updated user profile
     */
    @Transactional
    public UserResponse updatePreferences(UUID userId, UpdatePreferencesRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        
        if (request.themeMode() != null) user.setThemeMode(request.themeMode());
        if (request.themePos() != null) user.setThemePos(request.themePos());
        if (request.themeNeg() != null) user.setThemeNeg(request.themeNeg());
        
        userRepository.save(user);
        return toResponse(user);
    }

    // ----------------------------------------------------------------
    // Private helpers
    // ----------------------------------------------------------------

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(), 
                user.getUsername(), 
                user.getEmail(), 
                user.getCreatedAt(), 
                user.getRole().name(),
                user.isEmailVerified(),
                user.getThemeMode(),
                user.getThemePos(),
                user.getThemeNeg()
        );
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
