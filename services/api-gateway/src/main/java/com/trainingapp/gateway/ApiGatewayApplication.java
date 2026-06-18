package com.trainingapp.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the API Gateway service.
 *
 * <p>The gateway is the single entry point for all client traffic. It validates
 * JWT access tokens, enforces CORS policy, applies rate limiting on authentication
 * endpoints, blocks access to internal routes, and proxies approved requests to
 * the appropriate downstream service.
 *
 * <p>Built on Spring Cloud Gateway (reactive / WebFlux + Netty).
 */
@SpringBootApplication
public class ApiGatewayApplication {

    /**
     * Bootstraps the API Gateway Spring application context.
     *
     * @param args command-line arguments passed to the JVM
     */
    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
