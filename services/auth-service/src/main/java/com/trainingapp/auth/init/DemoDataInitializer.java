package com.trainingapp.auth.init;

import com.trainingapp.auth.domain.Role;
import com.trainingapp.auth.domain.User;
import com.trainingapp.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the default Demo user account on application startup.
 *
 * <p>Credentials: username {@code demo}, password {@code demo}.
 * The account is created with {@code emailVerified = true} so guests can log in immediately.
 */
@Component
public class DemoDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoDataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public static final java.util.UUID DEMO_USER_ID = java.util.UUID.nameUUIDFromBytes("demo".getBytes(java.nio.charset.StandardCharsets.UTF_8));

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.existsByUsername("demo")) {
            log.info("Demo user 'demo' already exists — skipping seed.");
            return;
        }

        User demoUser = new User();
        // Set deterministic UUID so downstream services can recognize demo data
        try {
            java.lang.reflect.Field idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(demoUser, DEMO_USER_ID);
        } catch (Exception e) {
            log.warn("Could not set explicit UUID on demo user, falling back to auto-generation");
        }

        demoUser.setUsername("demo");
        demoUser.setEmail("demo@trainingapp.local");
        demoUser.setPasswordHash(passwordEncoder.encode("demo"));
        demoUser.setRole(Role.ROLE_USER);
        demoUser.setEmailVerified(true);

        userRepository.save(demoUser);
        log.info("Demo user 'demo' created successfully with ID: {} and emailVerified=true.", DEMO_USER_ID);
    }
}
