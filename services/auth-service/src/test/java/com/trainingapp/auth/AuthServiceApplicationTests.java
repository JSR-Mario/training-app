package com.trainingapp.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * Smoke test that verifies the Auth Service Spring context loads without errors.
 */
@SpringBootTest
class AuthServiceApplicationTests {

    @MockBean
    private JavaMailSender mailSender;

    @Test
    void contextLoads() {
        // If the application context fails to start, this test will fail.
    }
}
