package com.trainingapp.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Auth Service.
 *
 * <p>Responsible for user management, JWT issuance (access tokens), refresh token
 * lifecycle via HttpOnly cookies, and idempotent seeding of the admin user from
 * environment variables on startup.
 */
@SpringBootApplication
public class AuthServiceApplication {

    /**
     * Bootstraps the Auth Service Spring application context.
     *
     * @param args command-line arguments passed to the JVM
     */
    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }
}
