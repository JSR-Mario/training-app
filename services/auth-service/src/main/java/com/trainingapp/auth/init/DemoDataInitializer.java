package com.trainingapp.auth.init;

import com.trainingapp.auth.domain.Role;
import com.trainingapp.auth.domain.User;
import com.trainingapp.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
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
@Profile("!test")
public class DemoDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public DemoDataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder, org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    public static final java.util.UUID DEMO_USER_ID = java.util.UUID.nameUUIDFromBytes("demo".getBytes(java.nio.charset.StandardCharsets.UTF_8));

    @Override
    @Transactional
    public void run(String... args) {
        userRepository.findByUsername("demo").ifPresent(user -> {
            if (!DEMO_USER_ID.equals(user.getId())) {
                log.info("Outdated demo user found with wrong UUID {}. Deleting to recreate with correct UUID...", user.getId());
                userRepository.delete(user);
                userRepository.flush();
            }
        });

        if (userRepository.existsByUsername("demo")) {
            log.info("Demo user 'demo' already exists with correct UUID — skipping seed.");
            return;
        }

        String sql = "INSERT INTO auth.users (id, username, email, password_hash, created_at, role, email_verified, theme_mode, theme_pos, theme_neg) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        jdbcTemplate.update(
            sql,
            DEMO_USER_ID,
            "demo",
            "demo@trainingapp.local",
            passwordEncoder.encode("demo"),
            java.sql.Timestamp.from(java.time.Instant.now()),
            Role.ROLE_USER.name(),
            true,
            "light",
            "blue",
            "red"
        );
        log.info("Demo user 'demo' created successfully with ID: {} and emailVerified=true.", DEMO_USER_ID);
    }
}
