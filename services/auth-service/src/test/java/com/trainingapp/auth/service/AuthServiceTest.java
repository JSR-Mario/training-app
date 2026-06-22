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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
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
    @Mock private JwtService jwtService;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private User sampleUser;
    private UUID sampleId;

    @BeforeEach
    void setUp() {
        sampleId = UUID.randomUUID();
        sampleUser = new User();
        sampleUser.setUsername("testuser");
        sampleUser.setEmail("test@example.com");
        sampleUser.setPasswordHash("hashed");
    }

    // ----------------------------------------------------------------
    // register
    // ----------------------------------------------------------------

    @Test
    void register_success_returnsUserResponse() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setUsername("testuser");
            u.setEmail("test@example.com");
            u.setPasswordHash("hashed");
            return u;
        });

        UserResponse response = authService.register(
                new RegisterRequest("testuser", "test@example.com", "password123"));

        assertThat(response.username()).isEqualTo("testuser");
        assertThat(response.email()).isEqualTo("test@example.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_duplicateUsername_throwsDuplicateResourceException() {
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        assertThatThrownBy(() ->
                authService.register(new RegisterRequest("testuser", "new@example.com", "password123")))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Username");

        verify(userRepository, never()).save(any());
    }

    @Test
    void register_duplicateEmail_throwsDuplicateResourceException() {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        assertThatThrownBy(() ->
                authService.register(new RegisterRequest("newuser", "test@example.com", "password123")))
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
        when(passwordEncoder.matches("password123", "hashed")).thenReturn(true);
        when(jwtService.generateAccessToken(any(User.class))).thenReturn("access-token-123");
        when(jwtService.generateRefreshToken(any(User.class))).thenReturn("refresh-token-456");
        when(jwtService.accessExpirySeconds()).thenReturn(900L);

        AuthService.LoginResult result = authService.login(new LoginRequest("testuser", "password123"));

        assertThat(result.authResponse().accessToken()).isEqualTo("access-token-123");
        assertThat(result.authResponse().tokenType()).isEqualTo("Bearer");
        assertThat(result.refreshToken()).isEqualTo("refresh-token-456");
    }

    @Test
    void login_unknownUser_throwsBadCredentialsException() {
        when(userRepository.findByUsername("nobody")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("nobody", "password123")))
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
}
