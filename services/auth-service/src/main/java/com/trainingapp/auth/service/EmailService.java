package com.trainingapp.auth.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Service for sending account verification emails.
 *
 * <p>If SMTP is not configured (e.g., in local development or when {@code SPRING_MAIL_HOST}
 * is absent), the verification link is logged to the console so developers and testers can
 * verify accounts without needing a real SMTP server. The {@link JavaMailSender} dependency
 * is optional — Spring Boot only auto-configures it when {@code spring.mail.host} is set.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    /** Null when {@code spring.mail.host} is not configured. */
    private final JavaMailSender mailSender;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    /**
     * Constructs the service with an optional {@link JavaMailSender}.
     * Spring Boot only auto-configures this bean when {@code spring.mail.host} is set.
     * When absent, {@code mailSender} is {@code null} and the service falls back to
     * console-logging verification links.
     *
     * @param mailSender optional Spring Mail sender bean
     */
    public EmailService(Optional<JavaMailSender> mailSender) {
        this.mailSender = mailSender.orElse(null);
    }

    /**
     * Sends an email verification link to the specified user.
     *
     * <p>Falls back to console logging if SMTP is not configured.
     *
     * @param toEmail  recipient email address
     * @param username recipient username
     * @param token    verification token
     */
    public void sendVerificationEmail(String toEmail, String username, String token) {
        String verificationUrl = frontendUrl + "/verify-email?token=" + token;

        if (mailSender == null || mailHost == null || mailHost.isBlank()) {
            log.info("=================================================================");
            log.info("EMAIL VERIFICATION LINK (No SMTP host configured)");
            log.info("User: {} ({})", username, toEmail);
            log.info("Verification Link: {}", verificationUrl);
            log.info("=================================================================");
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

            log.info("Verification email successfully sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage(), e);
            log.info("FALLBACK VERIFICATION LINK for {}: {}", toEmail, verificationUrl);
        }
    }
}
