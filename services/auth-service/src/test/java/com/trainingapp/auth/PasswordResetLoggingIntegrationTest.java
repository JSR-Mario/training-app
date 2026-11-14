package com.trainingapp.auth;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.trainingapp.auth.domain.PasswordResetToken;
import com.trainingapp.auth.domain.Role;
import com.trainingapp.auth.domain.User;
import com.trainingapp.auth.repository.PasswordResetTokenRepository;
import com.trainingapp.auth.repository.UserRepository;
import com.trainingapp.auth.repository.VerificationTokenRepository;
import com.trainingapp.auth.service.AuthService;
import com.trainingapp.auth.service.EmailService;
import com.trainingapp.auth.service.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Verifies end-to-end logging behavior and thread execution for password reset flow
 * across non-dev (prod), unprofiled (no active profiles), and dev environments.
 */
@ExtendWith(MockitoExtension.class)
class PasswordResetLoggingIntegrationTest {

    @Mock private UserRepository userRepository;
    @Mock private VerificationTokenRepository verificationTokenRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private JwtService jwtService;
    @Mock private PasswordEncoder passwordEncoder;

    private ThreadPoolTaskExecutor emailExecutor;
    private ListAppender<ILoggingEvent> logWatcher;
    private Logger emailServiceLogger;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        emailExecutor = new ThreadPoolTaskExecutor();
        emailExecutor.setCorePoolSize(2);
        emailExecutor.setMaxPoolSize(4);
        emailExecutor.setQueueCapacity(50);
        emailExecutor.setThreadNamePrefix("email-exec-");
        emailExecutor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        emailExecutor.initialize();

        emailServiceLogger = (Logger) LoggerFactory.getLogger(EmailService.class);
        logWatcher = new ListAppender<>();
        logWatcher.start();
        emailServiceLogger.addAppender(logWatcher);

        sampleUser = new User();
        ReflectionTestUtils.setField(sampleUser, "id", UUID.randomUUID());
        sampleUser.setUsername("testuser");
        sampleUser.setEmail("testuser@example.com");
        sampleUser.setRole(Role.ROLE_USER);
        sampleUser.setEmailVerified(true);
    }

    @AfterEach
    void tearDown() {
        if (emailServiceLogger != null && logWatcher != null) {
            emailServiceLogger.detachAppender(logWatcher);
        }
        if (emailExecutor != null) {
            emailExecutor.shutdown();
        }
    }

    @Test
    void forgotPassword_prodProfile_noSmtp_executesOnEmailExecutorAndLogsGenericErrorWithoutToken() throws Exception {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        EmailService emailService = new EmailService(Optional.empty(), env);
        ReflectionTestUtils.setField(emailService, "frontendUrl", "https://training.example.com");
        ReflectionTestUtils.setField(emailService, "mailHost", "");

        AuthService authService = new AuthService(
                userRepository,
                verificationTokenRepository,
                passwordResetTokenRepository,
                jwtService,
                passwordEncoder,
                emailService,
                emailExecutor
        );

        when(userRepository.findByEmail("testuser@example.com")).thenReturn(Optional.of(sampleUser));
        when(passwordResetTokenRepository.findTopByUserOrderByCreatedAtDesc(sampleUser)).thenReturn(Optional.empty());

        authService.forgotPassword("testuser@example.com");

        // Wait for async task on emailExecutor
        emailExecutor.getThreadPoolExecutor().awaitTermination(500, TimeUnit.MILLISECONDS);

        // Assert error logged
        assertThat(logWatcher.list).anyMatch(event ->
                event.getLevel() == Level.ERROR &&
                event.getThreadName().startsWith("email-exec-") &&
                event.getFormattedMessage().equals("Failed to send password reset email: SMTP host is not configured.")
        );

        // Assert no reset URL, token, or plaintext email in logs
        for (ILoggingEvent event : logWatcher.list) {
            assertThat(event.getFormattedMessage()).doesNotContain("https://training.example.com");
            assertThat(event.getFormattedMessage()).doesNotContain("token=");
            assertThat(event.getFormattedMessage()).doesNotContain("testuser@example.com");
        }
    }

    @Test
    void forgotPassword_noActiveProfileSet_executesOnEmailExecutorAndLogsGenericErrorWithoutToken() throws Exception {
        MockEnvironment env = new MockEnvironment(); // No active profiles

        EmailService emailService = new EmailService(Optional.empty(), env);
        ReflectionTestUtils.setField(emailService, "frontendUrl", "https://training.example.com");
        ReflectionTestUtils.setField(emailService, "mailHost", "");

        AuthService authService = new AuthService(
                userRepository,
                verificationTokenRepository,
                passwordResetTokenRepository,
                jwtService,
                passwordEncoder,
                emailService,
                emailExecutor
        );

        when(userRepository.findByEmail("testuser@example.com")).thenReturn(Optional.of(sampleUser));
        when(passwordResetTokenRepository.findTopByUserOrderByCreatedAtDesc(sampleUser)).thenReturn(Optional.empty());

        authService.forgotPassword("testuser@example.com");

        emailExecutor.getThreadPoolExecutor().awaitTermination(500, TimeUnit.MILLISECONDS);

        assertThat(logWatcher.list).anyMatch(event ->
                event.getLevel() == Level.ERROR &&
                event.getThreadName().startsWith("email-exec-") &&
                event.getFormattedMessage().equals("Failed to send password reset email: SMTP host is not configured.")
        );

        for (ILoggingEvent event : logWatcher.list) {
            assertThat(event.getFormattedMessage()).doesNotContain("https://training.example.com");
            assertThat(event.getFormattedMessage()).doesNotContain("token=");
            assertThat(event.getFormattedMessage()).doesNotContain("testuser@example.com");
        }
    }

    @Test
    void forgotPassword_devProfile_noSmtp_executesOnEmailExecutorAndLogsFallbackLink() throws Exception {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        EmailService emailService = new EmailService(Optional.empty(), env);
        ReflectionTestUtils.setField(emailService, "frontendUrl", "http://localhost:4200");
        ReflectionTestUtils.setField(emailService, "mailHost", "");

        AuthService authService = new AuthService(
                userRepository,
                verificationTokenRepository,
                passwordResetTokenRepository,
                jwtService,
                passwordEncoder,
                emailService,
                emailExecutor
        );

        when(userRepository.findByEmail("testuser@example.com")).thenReturn(Optional.of(sampleUser));
        when(passwordResetTokenRepository.findTopByUserOrderByCreatedAtDesc(sampleUser)).thenReturn(Optional.empty());

        authService.forgotPassword("testuser@example.com");

        emailExecutor.getThreadPoolExecutor().awaitTermination(500, TimeUnit.MILLISECONDS);

        assertThat(logWatcher.list).anyMatch(event ->
                event.getLevel() == Level.INFO &&
                event.getThreadName().startsWith("email-exec-") &&
                event.getFormattedMessage().contains("PASSWORD RESET LINK (Development fallback)")
        );
        assertThat(logWatcher.list).anyMatch(event ->
                event.getLevel() == Level.INFO &&
                event.getThreadName().startsWith("email-exec-") &&
                event.getFormattedMessage().contains("http://localhost:4200/reset-password#token=")
        );
    }
}
