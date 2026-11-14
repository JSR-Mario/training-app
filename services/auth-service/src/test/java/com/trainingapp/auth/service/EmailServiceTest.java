package com.trainingapp.auth.service;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link EmailService} verifying strict environment profile gating,
 * configuration validation, and absence of sensitive link leakage in logs.
 */
@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private Environment environment;

    private ListAppender<ILoggingEvent> logWatcher;
    private Logger emailServiceLogger;

    @BeforeEach
    void setupLogWatcher() {
        emailServiceLogger = (Logger) LoggerFactory.getLogger(EmailService.class);
        logWatcher = new ListAppender<>();
        logWatcher.start();
        emailServiceLogger.addAppender(logWatcher);
    }

    @AfterEach
    void detachLogWatcher() {
        if (emailServiceLogger != null && logWatcher != null) {
            emailServiceLogger.detachAppender(logWatcher);
        }
    }

    @Test
    void validateConfiguration_throwsIllegalStateExceptionWhenFrontendUrlBlank() {
        EmailService service = new EmailService(Optional.empty(), environment);
        ReflectionTestUtils.setField(service, "frontendUrl", "");

        assertThatThrownBy(service::validateConfiguration)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.frontend.url must be configured and cannot be blank.");
    }

    @Test
    void validateConfiguration_succeedsWhenFrontendUrlConfigured() {
        EmailService service = new EmailService(Optional.empty(), environment);
        ReflectionTestUtils.setField(service, "frontendUrl", "https://training.example.com");

        service.validateConfiguration(); // Should not throw
    }

    @Test
    void isDevEnvironment_dependsStrictlyOnActiveProfiles() {
        EmailService service = new EmailService(Optional.empty(), environment);

        // No profile set (default prod behavior)
        when(environment.getActiveProfiles()).thenReturn(new String[]{});
        assertThat(service.isDevEnvironment()).isFalse();

        // Prod profile set
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        assertThat(service.isDevEnvironment()).isFalse();

        // Dev profile set
        when(environment.getActiveProfiles()).thenReturn(new String[]{"dev"});
        assertThat(service.isDevEnvironment()).isTrue();

        // Local profile set
        when(environment.getActiveProfiles()).thenReturn(new String[]{"local"});
        assertThat(service.isDevEnvironment()).isTrue();

        // Test profile set
        when(environment.getActiveProfiles()).thenReturn(new String[]{"test"});
        assertThat(service.isDevEnvironment()).isTrue();
    }

    @Test
    void sendPasswordResetEmail_prodProfile_noSmtp_logsGenericErrorWithoutTokenOrUrl() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        EmailService service = new EmailService(Optional.empty(), environment);
        ReflectionTestUtils.setField(service, "frontendUrl", "https://training.example.com");
        ReflectionTestUtils.setField(service, "mailHost", "");

        String rawToken = "super-secret-reset-token-12345";
        service.sendPasswordResetEmail("user@example.com", "testuser", rawToken);

        assertThat(logWatcher.list).anyMatch(event ->
                event.getLevel() == Level.ERROR &&
                event.getFormattedMessage().equals("Failed to send password reset email: SMTP host is not configured.")
        );

        // Verify zero leakage of secret token, URL or email in ANY log message
        for (ILoggingEvent event : logWatcher.list) {
            assertThat(event.getFormattedMessage()).doesNotContain(rawToken);
            assertThat(event.getFormattedMessage()).doesNotContain("https://training.example.com");
            assertThat(event.getFormattedMessage()).doesNotContain("user@example.com");
        }
    }

    @Test
    void sendPasswordResetEmail_noActiveProfiles_defaultSafe_logsGenericErrorWithoutTokenOrUrl() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{});
        EmailService service = new EmailService(Optional.empty(), environment);
        ReflectionTestUtils.setField(service, "frontendUrl", "https://training.example.com");
        ReflectionTestUtils.setField(service, "mailHost", "");

        String rawToken = "super-secret-token-unprofiled-98765";
        service.sendPasswordResetEmail("alice@domain.org", "alice", rawToken);

        assertThat(logWatcher.list).anyMatch(event ->
                event.getLevel() == Level.ERROR &&
                event.getFormattedMessage().equals("Failed to send password reset email: SMTP host is not configured.")
        );

        for (ILoggingEvent event : logWatcher.list) {
            assertThat(event.getFormattedMessage()).doesNotContain(rawToken);
            assertThat(event.getFormattedMessage()).doesNotContain("https://training.example.com");
            assertThat(event.getFormattedMessage()).doesNotContain("alice@domain.org");
        }
    }

    @Test
    void sendPasswordResetEmail_devProfile_noSmtp_logsDevFallbackWithFragment() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"dev"});
        EmailService service = new EmailService(Optional.empty(), environment);
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:4200");
        ReflectionTestUtils.setField(service, "mailHost", "");

        String rawToken = "dev-token-abc";
        service.sendPasswordResetEmail("developer@example.com", "devuser", rawToken);

        assertThat(logWatcher.list).anyMatch(event ->
                event.getLevel() == Level.INFO &&
                event.getFormattedMessage().contains("PASSWORD RESET LINK (Development fallback)")
        );
        assertThat(logWatcher.list).anyMatch(event ->
                event.getLevel() == Level.INFO &&
                event.getFormattedMessage().contains("http://localhost:4200/reset-password#token=dev-token-abc")
        );
    }
}
