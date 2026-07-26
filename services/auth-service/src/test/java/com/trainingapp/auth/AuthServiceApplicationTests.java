package com.trainingapp.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Smoke test that verifies the Auth Service Spring context loads without errors,
 * including when no SMTP server is configured (JavaMailSender is optional).
 */
@SpringBootTest
class AuthServiceApplicationTests {

    @Test
    void contextLoads() {
        // If the application context fails to start, this test will fail.
    }
}
