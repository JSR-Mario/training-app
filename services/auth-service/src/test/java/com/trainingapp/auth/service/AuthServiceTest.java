package com.trainingapp.auth.service;

import com.trainingapp.auth.domain.PasswordResetToken;
import com.trainingapp.auth.domain.User;
import com.trainingapp.auth.dto.AuthResponse;
import com.trainingapp.auth.dto.LoginRequest;
import com.trainingapp.auth.dto.RegisterRequest;
import com.trainingapp.auth.dto.UserResponse;
import com.trainingapp.auth.exception.DemoUserProtectionException;
import com.trainingapp.auth.exception.DuplicateResourceException;
import com.trainingapp.auth.exception.InvalidResetTokenException;
import com.trainingapp.auth.exception.InvalidTokenException;
import com.trainingapp.auth.exception.ResourceNotFoundException;
import com.trainingapp.auth.repository.PasswordResetTokenRepository;
import com.trainingapp.auth.repository.UserRepository;
import com.trainingapp.auth.repository.VerificationTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AuthService}.
 *
 * <p>No Spring context is loaded. All collaborators are mocked via Mockito.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private VerificationTokenRepository verificationTokenRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private JwtService jwtService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private User sampleUser;
    private UUID sampleId;

    @BeforeEach
    void setUp() {
        sampleId = UUID.randomUUID();
        sampleUser = new User();
        ReflectionTestUtils.setField(sampleUser, "id", sampleId);
        sampleUser.setUsername("testuser");
        sampleUser.setEmail("test@example.com");
        sampleUser.setPasswordHash("hashed");
        sampleUser.setRole(com.trainingapp.auth.domain.Role.ROLE_USER);
        sampleUser.setEmailVerified(true);
    }

    // ----------------------------------------------------------------
    // register
    // ----------------------------------------------------------------

    @Test
    void register_success_returnsUserResponse() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setUsername("testuser");
            u.setEmail("test@example.com");
            u.setPasswordHash("hashed");
            return u;
        });

        UserResponse response = authService.register(
                new RegisterRequest("testuser", "test@example.com", "Password123"));

        assertThat(response.username()).isEqualTo("testuser");
        assertThat(response.email()).isEqualTo("test@example.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_duplicateUsername_throwsDuplicateResourceException() {
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        assertThatThrownBy(() ->
                authService.register(new RegisterRequest("testuser", "new@example.com", "Password123")))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Username");

        verify(userRepository, never()).save(any());
    }

    @Test
    void register_duplicateEmail_throwsDuplicateResourceException() {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        assertThatThrownBy(() ->
                authService.register(new RegisterRequest("newuser", "test@example.com", "Password123")))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Email");

        verify(userRepository, never()).save(any());
    }

    // ----------------------------------------------------------------
    // login
    // ----------------------------------------------------------------

    @Test
    void login_success_returnsLoginResult() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("Password123", "hashed")).thenReturn(true);
        when(jwtService.generateAccessToken(any(User.class))).thenReturn("access-token-123");
        when(jwtService.generateRefreshToken(any(User.class))).thenReturn("refresh-token-456");
        when(jwtService.accessExpirySeconds()).thenReturn(900L);

        AuthService.LoginResult result = authService.login(new LoginRequest("testuser", "Password123"));

        assertThat(result.authResponse().accessToken()).isEqualTo("access-token-123");
        assertThat(result.authResponse().tokenType()).isEqualTo("Bearer");
        assertThat(result.refreshToken()).isEqualTo("refresh-token-456");
    }

    @Test
    void login_unknownUser_throwsBadCredentialsException() {
        when(userRepository.findByUsername("nobody")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("nobody", "Password123")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void login_wrongPassword_throwsBadCredentialsException() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("wrongpass", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("testuser", "wrongpass")))
                .isInstanceOf(BadCredentialsException.class);
    }

    // ----------------------------------------------------------------
    // refresh
    // ----------------------------------------------------------------

    @Test
    void refresh_validRefreshToken_returnsNewAccessToken() {
        when(jwtService.isValid("refresh.token")).thenReturn(true);
        when(jwtService.isRefreshToken("refresh.token")).thenReturn(true);
        when(jwtService.extractUserId("refresh.token")).thenReturn(sampleId);
        when(jwtService.generateAccessToken(any(User.class))).thenReturn("new.access.token");
        when(jwtService.accessExpirySeconds()).thenReturn(900L);
        when(userRepository.findById(sampleId)).thenReturn(Optional.of(sampleUser));

        AuthResponse response = authService.refresh("refresh.token");

        assertThat(response.accessToken()).isEqualTo("new.access.token");
    }

    @Test
    void refresh_expiredToken_throwsInvalidTokenException() {
        when(jwtService.isValid("expired.token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh("expired.token"))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void refresh_accessTokenUsedAsRefresh_throwsInvalidTokenException() {
        when(jwtService.isValid("access.token")).thenReturn(true);
        when(jwtService.isRefreshToken("access.token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh("access.token"))
                .isInstanceOf(InvalidTokenException.class);
    }

    // ----------------------------------------------------------------
    // getUser
    // ----------------------------------------------------------------

    @Test
    void getUser_existingUser_returnsUserResponse() {
        when(userRepository.findById(sampleId)).thenReturn(Optional.of(sampleUser));

        UserResponse response = authService.getUser(sampleId);

        assertThat(response.id()).isEqualTo(sampleId);
        assertThat(response.username()).isEqualTo("testuser");
        assertThat(response.role()).isEqualTo("ROLE_USER");
    }

    @Test
    void getUser_unknownId_throwsResourceNotFoundException() {
        when(userRepository.findById(sampleId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getUser(sampleId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ----------------------------------------------------------------
    // forgotPassword
    // ----------------------------------------------------------------

    @Test
    void forgotPassword_existingUser_createsHashedTokenAndDispatchesEmail() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(sampleUser));
        when(passwordResetTokenRepository.findTopByUserOrderByCreatedAtDesc(sampleUser)).thenReturn(Optional.empty());

        authService.forgotPassword("test@example.com");

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).deleteByUser(sampleUser);
        verify(passwordResetTokenRepository).save(tokenCaptor.capture());

        PasswordResetToken savedToken = tokenCaptor.getValue();
        assertThat(savedToken.getUser()).isEqualTo(sampleUser);
        assertThat(savedToken.getTokenHash()).hasSize(64);
        assertThat(savedToken.getExpiresAt()).isAfter(Instant.now());
    }

    @Test
    void forgotPassword_unknownEmail_silentlyReturnsWithoutSavingOrSending() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        authService.forgotPassword("missing@example.com");

        verify(passwordResetTokenRepository, never()).save(any());
        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString());
    }

    @Test
    void forgotPassword_demoUser_silentlyReturnsWithoutSavingOrSending() {
        User demoUser = new User();
        ReflectionTestUtils.setField(demoUser, "id", com.trainingapp.auth.config.DemoUserInterceptor.DEMO_USER_ID);
        demoUser.setUsername("demo");
        demoUser.setEmail("demo@trainingapp.local");

        when(userRepository.findByEmail("demo@trainingapp.local")).thenReturn(Optional.of(demoUser));

        authService.forgotPassword("demo@trainingapp.local");

        verify(passwordResetTokenRepository, never()).save(any());
        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString());
    }

    @Test
    void forgotPassword_withinCooldown_silentlySkipsTokenCreation() {
        PasswordResetToken recentToken = new PasswordResetToken();
        recentToken.setUser(sampleUser);
        ReflectionTestUtils.setField(recentToken, "createdAt", Instant.now().minusSeconds(30));

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(sampleUser));
        when(passwordResetTokenRepository.findTopByUserOrderByCreatedAtDesc(sampleUser)).thenReturn(Optional.of(recentToken));

        authService.forgotPassword("test@example.com");

        verify(passwordResetTokenRepository, never()).save(any());
        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString());
    }

    // ----------------------------------------------------------------
    // resetPassword
    // ----------------------------------------------------------------

    @Test
    void resetPassword_validToken_updatesPasswordAndInvalidatesTokens() throws Exception {
        String rawToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
        String tokenHash = java.util.HexFormat.of().formatHex(digest.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8)));

        sampleUser.setEmailVerified(false);

        PasswordResetToken token = new PasswordResetToken();
        token.setUser(sampleUser);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(Instant.now().plus(java.time.Duration.ofMinutes(15)));

        when(passwordResetTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("NewSecret123")).thenReturn("newHashedPassword");

        authService.resetPassword(rawToken, "NewSecret123");

        assertThat(sampleUser.getPasswordHash()).isEqualTo("newHashedPassword");
        assertThat(sampleUser.getPasswordChangedAt()).isNotNull();
        assertThat(sampleUser.isEmailVerified()).isTrue();

        verify(userRepository).save(sampleUser);
        verify(passwordResetTokenRepository).deleteByUser(sampleUser);
    }

    @Test
    void resetPassword_expiredToken_throwsInvalidResetTokenException() throws Exception {
        String rawToken = "expired-token-raw-value-0123456789";
        java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
        String tokenHash = java.util.HexFormat.of().formatHex(digest.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8)));

        PasswordResetToken token = new PasswordResetToken();
        token.setUser(sampleUser);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(Instant.now().minus(java.time.Duration.ofMinutes(1)));

        when(passwordResetTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> authService.resetPassword(rawToken, "NewSecret123"))
                .isInstanceOf(InvalidResetTokenException.class);

        verify(passwordResetTokenRepository).delete(token);
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_unknownToken_throwsInvalidResetTokenException() {
        when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.resetPassword("random-token", "NewSecret123"))
                .isInstanceOf(InvalidResetTokenException.class);
    }

    @Test
    void resetPassword_demoUserToken_throwsDemoUserProtectionException() throws Exception {
        String rawToken = "demo-user-token-0123456789";
        java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
        String tokenHash = java.util.HexFormat.of().formatHex(digest.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8)));

        User demoUser = new User();
        ReflectionTestUtils.setField(demoUser, "id", com.trainingapp.auth.config.DemoUserInterceptor.DEMO_USER_ID);
        demoUser.setUsername("demo");

        PasswordResetToken token = new PasswordResetToken();
        token.setUser(demoUser);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(Instant.now().plus(java.time.Duration.ofMinutes(10)));

        when(passwordResetTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> authService.resetPassword(rawToken, "NewSecret123"))
                .isInstanceOf(DemoUserProtectionException.class);
    }

    // ----------------------------------------------------------------
    // refresh with passwordChangedAt
    // ----------------------------------------------------------------

    @Test
    void refresh_issuedBeforePasswordChangedAt_throwsInvalidTokenException() {
        Instant passwordChanged = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        sampleUser.setPasswordChangedAt(passwordChanged);

        when(jwtService.isValid("refresh.token")).thenReturn(true);
        when(jwtService.isRefreshToken("refresh.token")).thenReturn(true);
        when(jwtService.extractUserId("refresh.token")).thenReturn(sampleId);
        when(userRepository.findById(sampleId)).thenReturn(Optional.of(sampleUser));
        when(jwtService.extractIssuedAt("refresh.token")).thenReturn(passwordChanged.minusSeconds(10));

        assertThatThrownBy(() -> authService.refresh("refresh.token"))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("invalidated by a recent password change");
    }

    @Test
    void refresh_issuedAfterPasswordChangedAt_success() {
        Instant passwordChanged = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        sampleUser.setPasswordChangedAt(passwordChanged);

        when(jwtService.isValid("refresh.token")).thenReturn(true);
        when(jwtService.isRefreshToken("refresh.token")).thenReturn(true);
        when(jwtService.extractUserId("refresh.token")).thenReturn(sampleId);
        when(userRepository.findById(sampleId)).thenReturn(Optional.of(sampleUser));
        when(jwtService.extractIssuedAt("refresh.token")).thenReturn(passwordChanged.plusSeconds(10));
        when(jwtService.generateAccessToken(sampleUser)).thenReturn("new-access-token");
        when(jwtService.accessExpirySeconds()).thenReturn(900L);

        AuthResponse resp = authService.refresh("refresh.token");

        assertThat(resp.accessToken()).isEqualTo("new-access-token");
    }
}
