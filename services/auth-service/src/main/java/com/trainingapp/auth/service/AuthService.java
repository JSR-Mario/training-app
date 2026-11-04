package com.trainingapp.auth.service;

import com.trainingapp.auth.config.DemoUserInterceptor;
import com.trainingapp.auth.domain.PasswordResetToken;
import com.trainingapp.auth.domain.User;
import com.trainingapp.auth.domain.VerificationToken;
import com.trainingapp.auth.dto.AuthResponse;
import com.trainingapp.auth.dto.LoginRequest;
import com.trainingapp.auth.dto.RegisterRequest;
import com.trainingapp.auth.dto.UpdatePreferencesRequest;
import com.trainingapp.auth.dto.UserResponse;
import com.trainingapp.auth.exception.DemoUserProtectionException;
import com.trainingapp.auth.exception.DuplicateResourceException;
import com.trainingapp.auth.exception.EmailNotVerifiedException;
import com.trainingapp.auth.exception.InvalidResetTokenException;
import com.trainingapp.auth.exception.InvalidTokenException;
import com.trainingapp.auth.exception.RateLimitExceededException;
import com.trainingapp.auth.exception.ResourceNotFoundException;
import com.trainingapp.auth.repository.PasswordResetTokenRepository;
import com.trainingapp.auth.repository.UserRepository;
import com.trainingapp.auth.repository.VerificationTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

/**
 * Core authentication business logic.
 *
 * <p>Handles user registration, login credential verification, access-token
 * refresh, password reset workflows, and profile retrieval.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final Executor emailExecutor;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(UserRepository userRepository,
                       VerificationTokenRepository verificationTokenRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       JwtService jwtService,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService,
                       @Qualifier("emailExecutor") Executor emailExecutor) {
        this.userRepository = userRepository;
        this.verificationTokenRepository = verificationTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.emailExecutor = emailExecutor;
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
        VerificationToken verificationToken = verificationTokenRepository.findByToken(token)
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

        Optional<VerificationToken> existingOpt = verificationTokenRepository.findByUser(user);
        if (existingOpt.isPresent()) {
            VerificationToken existing = existingOpt.get();
            if (Instant.now().isBefore(existing.getLastSentAt().plusSeconds(60))) {
                throw new RateLimitExceededException("Please wait 60 seconds before requesting another verification email.");
            }
            existing.setToken(UUID.randomUUID().toString().replace("-", ""));
            existing.setExpiresAt(Instant.now().plus(Duration.ofHours(1)));
            existing.setLastSentAt(Instant.now());
            verificationTokenRepository.save(existing);
            emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), existing.getToken());
        } else {
            createAndSendVerificationToken(user);
        }
    }

    private void createAndSendVerificationToken(User user) {
        VerificationToken token = new VerificationToken();
        token.setUser(user);
        token.setToken(UUID.randomUUID().toString().replace("-", ""));
        token.setExpiresAt(Instant.now().plus(Duration.ofHours(1)));
        token.setLastSentAt(Instant.now());
        verificationTokenRepository.save(token);

        emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), token.getToken());
    }

    /**
     * Initiates a password reset request.
     *
     * <p>Always completes without throwing user-not-found exceptions to prevent account enumeration.
     * If an account is found and is not the demo user:
     * <ul>
     *   <li>Enforces a 60-second cooldown to prevent email bombing.</li>
     *   <li>Invalidates all previous unconsumed tokens for this user.</li>
     *   <li>Cleans up expired tokens opportunistically.</li>
     *   <li>Generates a cryptographically random token, stores its SHA-256 hash, and schedules
     *       asynchronous email dispatch after transaction commit.</li>
     * </ul>
     *
     * @param email the target user's email address
     */
    @Transactional
    public void forgotPassword(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return;
        }

        User user = userOpt.get();
        if (isDemoUser(user)) {
            return;
        }

        // Throttle check: 60-second cooldown per account
        Optional<PasswordResetToken> latestTokenOpt = passwordResetTokenRepository.findTopByUserOrderByCreatedAtDesc(user);
        if (latestTokenOpt.isPresent()) {
            PasswordResetToken latest = latestTokenOpt.get();
            if (Instant.now().isBefore(latest.getCreatedAt().plusSeconds(60))) {
                return;
            }
        }

        // Supersession: remove any existing tokens for this user
        passwordResetTokenRepository.deleteByUser(user);

        // Opportunistic cleanup of expired tokens
        passwordResetTokenRepository.deleteExpiredTokens(Instant.now());

        // Generate 32 cryptographically random bytes -> 64 hex characters
        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setTokenHash(tokenHash);
        resetToken.setExpiresAt(Instant.now().plus(Duration.ofMinutes(15)));
        passwordResetTokenRepository.save(resetToken);

        // Dispatch email asynchronously using dedicated bounded executor after transaction commit
        Runnable sendEmailTask = () -> {
            try {
                emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), rawToken);
            } catch (Exception e) {
                log.error("Failed to asynchronously send password reset email due to {}", e.getClass().getSimpleName());
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    CompletableFuture.runAsync(sendEmailTask, emailExecutor);
                }
            });
        } else {
            CompletableFuture.runAsync(sendEmailTask, emailExecutor);
        }
    }

    /**
     * Resets a user's password using a raw token.
     *
     * <p>Hashes the input token, validates existence and expiration, updates the password,
     * sets {@code passwordChangedAt} for session/refresh-token invalidation, activates
     * email verification (proof of email access), deletes the token atomically to guarantee single-use,
     * and asynchronously dispatches a notification email via the dedicated thread pool.
     *
     * @param rawToken    the raw unhashed reset token
     * @param newPassword the new plain-text password
     * @throws InvalidResetTokenException  if the token is invalid, expired, or already used
     * @throws DemoUserProtectionException if attempting to modify the demo account
     */
    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        String tokenHash = hashToken(rawToken);
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new InvalidResetTokenException("Invalid or expired password reset token."));

        if (resetToken.isExpired()) {
            passwordResetTokenRepository.delete(resetToken);
            throw new InvalidResetTokenException("Invalid or expired password reset token.");
        }

        User user = resetToken.getUser();
        if (isDemoUser(user)) {
            throw new DemoUserProtectionException("Demo user account cannot be modified.");
        }

        // Atomic consume: delete the token by hash. Must affect exactly 1 row.
        int deleted = passwordResetTokenRepository.deleteByTokenHash(tokenHash);
        if (deleted != 1) {
            throw new InvalidResetTokenException("Invalid or expired password reset token.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(Instant.now().truncatedTo(ChronoUnit.SECONDS));
        user.setEmailVerified(true);
        userRepository.save(user);

        // Single-use hygiene: delete any other remaining tokens for this user
        passwordResetTokenRepository.deleteByUser(user);

        // Dispatch confirmation notification asynchronously after commit using dedicated executor
        Runnable sendNotificationTask = () -> {
            try {
                emailService.sendPasswordChangedNotificationEmail(user.getEmail(), user.getUsername());
            } catch (Exception e) {
                log.error("Failed to asynchronously send password changed notification due to {}", e.getClass().getSimpleName());
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    CompletableFuture.runAsync(sendNotificationTask, emailExecutor);
                }
            });
        } else {
            CompletableFuture.runAsync(sendNotificationTask, emailExecutor);
        }
    }

    /**
     * Authenticates a user and returns a new pair of tokens.
     *
     * @param request the login payload (username, password)
     * @return an {@link AuthResponse} containing the access token
     * @throws BadCredentialsException  if authentication fails
     * @throws EmailNotVerifiedException if user email is not verified
     */
    @Transactional(readOnly = true)
    public LoginResult login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password."));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password.");
        }

        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException("Your email address is not verified. Please verify your account before logging in.");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        AuthResponse authResponse = new AuthResponse(accessToken, "Bearer", jwtService.accessExpirySeconds());
        return new LoginResult(authResponse, refreshToken);
    }

    /**
     * Issues a new access token in exchange for a valid refresh token.
     * Rejects refresh tokens whose issued-at time is strictly before {@code passwordChangedAt}.
     * Both timestamps are truncated to second precision for safe comparison.
     * Legacy users with {@code passwordChangedAt == null} are accepted without invalidation.
     *
     * @param refreshToken the JWT refresh token from the HttpOnly cookie
     * @return a new {@link AuthResponse} with a fresh access token
     * @throws InvalidTokenException if the token is invalid, expired, or invalidated by password reset
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
            throw new EmailNotVerifiedException("Your email address is not verified.");
        }

        if (user.getPasswordChangedAt() != null) {
            Instant issuedAt = jwtService.extractIssuedAt(refreshToken);
            if (issuedAt != null) {
                Instant truncatedIssuedAt = issuedAt.truncatedTo(ChronoUnit.SECONDS);
                Instant truncatedPasswordChangedAt = user.getPasswordChangedAt().truncatedTo(ChronoUnit.SECONDS);
                if (truncatedIssuedAt.isBefore(truncatedPasswordChangedAt)) {
                    throw new InvalidTokenException("Refresh token was invalidated by a recent password change. Please log in again.");
                }
            }
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

    private boolean isDemoUser(User user) {
        return DemoUserInterceptor.DEMO_USER_ID.equals(user.getId())
                || "demo".equalsIgnoreCase(user.getUsername())
                || "demo@trainingapp.local".equalsIgnoreCase(user.getEmail());
    }

    private String generateSecureToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return HexFormat.of().formatHex(randomBytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

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

    public record LoginResult(AuthResponse authResponse, String refreshToken) {}
}
