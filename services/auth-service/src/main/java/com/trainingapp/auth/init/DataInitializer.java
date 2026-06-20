package com.trainingapp.auth.init;

import com.trainingapp.auth.domain.User;
import com.trainingapp.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the admin user account on application startup.
 *
 * <p>This initializer is idempotent — it checks whether the admin username
 * already exists before attempting to create it. Running the application
 * multiple times will not create duplicate accounts.
 *
 * <p>Admin credentials are read exclusively from environment variables:
 * {@code ADMIN_USERNAME}, {@code ADMIN_EMAIL}, and {@code ADMIN_PASSWORD}.
 * If any of these are blank (e.g., in test environments), the seed is skipped
 * with a warning log rather than failing.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_USERNAME:}")
    private String adminUsername;

    @Value("${ADMIN_EMAIL:}")
    private String adminEmail;

    @Value("${ADMIN_PASSWORD:}")
    private String adminPassword;

    /**
     * Constructs the initializer with its required collaborators.
     *
     * @param userRepository  repository for checking and persisting the admin user
     * @param passwordEncoder BCrypt encoder for hashing the admin password
     */
    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Creates the admin user if the required environment variables are set
     * and no account with the configured username already exists.
     *
     * @param args command-line arguments (unused)
     */
    @Override
    @Transactional
    public void run(String... args) {
        if (adminUsername.isBlank() || adminEmail.isBlank() || adminPassword.isBlank()) {
            log.warn("Admin seed skipped — ADMIN_USERNAME, ADMIN_EMAIL, or ADMIN_PASSWORD is not set.");
            return;
        }

        if (userRepository.existsByUsername(adminUsername)) {
            log.info("Admin user '{}' already exists — skipping seed.", adminUsername);
            return;
        }

        User admin = new User();
        admin.setUsername(adminUsername);
        admin.setEmail(adminEmail);
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        userRepository.save(admin);

        log.info("Admin user '{}' created successfully.", adminUsername);
    }
}
