package com.trainingapp.auth.config;

import com.trainingapp.auth.exception.DemoUserProtectionException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;

/**
 * Interceptor that protects the Demo User account from profile and preferences modifications.
 */
@Component
public class DemoUserInterceptor implements HandlerInterceptor {

    public static final UUID DEMO_USER_ID = UUID.nameUUIDFromBytes("demo".getBytes(StandardCharsets.UTF_8));
    private static final Set<String> MUTATION_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String uri = request.getRequestURI();
        // Allow logout for demo user
        if (uri.endsWith("/logout")) {
            return true;
        }

        if (MUTATION_METHODS.contains(request.getMethod().toUpperCase())) {
            String userIdHeader = request.getHeader("X-User-Id");
            if (userIdHeader != null && !userIdHeader.isBlank()) {
                try {
                    UUID userId = UUID.fromString(userIdHeader);
                    if (DEMO_USER_ID.equals(userId)) {
                        throw new DemoUserProtectionException("Demo user account is read-only. Please create a free account to customize settings.");
                    }
                } catch (IllegalArgumentException ignored) {
                }
            }
        }
        return true;
    }
}
