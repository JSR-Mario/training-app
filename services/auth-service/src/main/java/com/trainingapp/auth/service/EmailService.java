package com.trainingapp.auth.service;

import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Optional;

/**
 * Service for sending account verification and password reset emails.
 *
 * <p>Console logging of sensitive links is strictly gated to development and test profiles.
 * In production or when no dev profile is active, missing SMTP configuration or failures
 * are logged as generic errors without leaking tokens, URLs, or personal data.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final Environment environment;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${app.frontend.url:}")
    private String frontendUrl;

    public EmailService(Optional<JavaMailSender> mailSender, Environment environment) {
        this.mailSender = mailSender.orElse(null);
        this.environment = environment;
    }

    @PostConstruct
    public void validateConfiguration() {
        if (frontendUrl == null || frontendUrl.isBlank()) {
            throw new IllegalStateException("app.frontend.url must be configured and cannot be blank.");
        }
    }

    /**
     * Checks whether the current runtime environment is considered a development/test environment.
     * Depends strictly on active Spring profiles (dev, local, test) - never heuristics.
     *
     * @return true if an active profile matches dev, local, or test; false otherwise.
     */
    boolean isDevEnvironment() {
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> p.equalsIgnoreCase("dev") || p.equalsIgnoreCase("local") || p.equalsIgnoreCase("test"));
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        int atIndex = email.indexOf('@');
        String name = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        if (name.length() <= 2) {
            return name.charAt(0) + "***" + domain;
        }
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + domain;
    }

    /**
     * Sends an email verification link to the specified user.
     *
     * @param toEmail  recipient email address
     * @param username recipient username
     * @param token    verification token
     */
    public void sendVerificationEmail(String toEmail, String username, String token) {
        String verificationUrl = frontendUrl + "/verify-email?token=" + token;

        if (mailSender == null || mailHost == null || mailHost.isBlank()) {
            if (isDevEnvironment()) {
                log.info("=================================================================");
                log.info("EMAIL VERIFICATION LINK (Development fallback)");
                log.info("User: {} ({})", username, maskEmail(toEmail));
                log.info("Verification Link: {}", verificationUrl);
                log.info("=================================================================");
            } else {
                log.error("Failed to send verification email: SMTP host is not configured.");
            }
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("noreply@jsr-mario.com");
            helper.setTo(toEmail);
            helper.setSubject("Verify your account - Yes Training App");

            String htmlBody = """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h2 style="color: #3b82f6;">Welcome to Yes Training App!</h2>
                    <p>Hi <strong>%s</strong>,</p>
                    <p>Thank you for signing up. Please verify your email address to activate your account:</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="%s" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
                    </div>
                    <p style="font-size: 13px; color: #666;">This link will expire in 1 hour. If you did not create an account, please ignore this email.</p>
                </div>
                """.formatted(username, verificationUrl);

            helper.setText(htmlBody, true);
            mailSender.send(message);

            log.info("Verification email successfully sent to {}", maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send verification email: {}", e.getClass().getSimpleName());
            if (isDevEnvironment()) {
                log.info("FALLBACK VERIFICATION LINK for {}: {}", maskEmail(toEmail), verificationUrl);
            }
        }
    }

    /**
     * Sends a password reset link to the specified user.
     * Uses a URL fragment (#token=...) to ensure the token is never transmitted in HTTP request lines
     * or captured by upstream reverse proxies, access logs, or Referer headers.
     *
     * @param toEmail  recipient email address
     * @param username recipient username
     * @param rawToken raw unhashed reset token
     */
    public void sendPasswordResetEmail(String toEmail, String username, String rawToken) {
        String resetUrl = frontendUrl + "/reset-password#token=" + rawToken;

        if (mailSender == null || mailHost == null || mailHost.isBlank()) {
            if (isDevEnvironment()) {
                log.info("=================================================================");
                log.info("PASSWORD RESET LINK (Development fallback)");
                log.info("User: {} ({})", username, maskEmail(toEmail));
                log.info("Reset Link: {}", resetUrl);
                log.info("=================================================================");
            } else {
                log.error("Failed to send password reset email: SMTP host is not configured.");
            }
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("noreply@jsr-mario.com");
            helper.setTo(toEmail);
            helper.setSubject("Reset your password - Yes Training App");

            String htmlBody = """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h2 style="color: #3b82f6;">Password Reset Request</h2>
                    <p>Hi <strong>%s</strong>,</p>
                    <p>We received a request to reset your password for your Yes Training App account. Click the button below to choose a new password:</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="%s" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="font-size: 13px; color: #e11d48; font-weight: bold;">This link is single-use and will expire in 15 minutes.</p>
                    <p style="font-size: 13px; color: #666;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                </div>
                """.formatted(username, resetUrl);

            helper.setText(htmlBody, true);
            mailSender.send(message);

            log.info("Password reset email successfully sent to {}", maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send password reset email: {}", e.getClass().getSimpleName());
            if (isDevEnvironment()) {
                log.info("FALLBACK RESET LINK for {}: {}", maskEmail(toEmail), resetUrl);
            }
        }
    }

    /**
     * Sends an email notification to the user after their password has been changed successfully.
     *
     * @param toEmail  recipient email address
     * @param username recipient username
     */
    public void sendPasswordChangedNotificationEmail(String toEmail, String username) {
        if (mailSender == null || mailHost == null || mailHost.isBlank()) {
            if (isDevEnvironment()) {
                log.info("PASSWORD CHANGED NOTIFICATION (Dev): Sent to {} ({})", username, maskEmail(toEmail));
            } else {
                log.error("Failed to send password changed notification email: SMTP host is not configured.");
            }
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("noreply@jsr-mario.com");
            helper.setTo(toEmail);
            helper.setSubject("Your password has been changed - Yes Training App");

            String htmlBody = """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h2 style="color: #3b82f6;">Your password has been changed</h2>
                    <p>Hi <strong>%s</strong>,</p>
                    <p>This is a confirmation that the password for your Yes Training App account has just been successfully changed.</p>
                    <p style="font-size: 13px; color: #666;">If you performed this action, no further steps are required. If you did not make this change, please contact support or reset your password immediately.</p>
                </div>
                """.formatted(username);

            helper.setText(htmlBody, true);
            mailSender.send(message);

            log.info("Password changed confirmation email sent to {}", maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send password changed notification email: {}", e.getClass().getSimpleName());
        }
    }
}
