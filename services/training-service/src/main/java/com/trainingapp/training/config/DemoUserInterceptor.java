package com.trainingapp.training.config;

import com.trainingapp.training.exception.DemoUserProtectionException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;

/**
 * Interceptor that enforces read-only access for the Demo User account across all state-changing operations.
 */
@Component
public class DemoUserInterceptor implements HandlerInterceptor {

    public static final UUID DEMO_USER_ID = UUID.nameUUIDFromBytes("demo".getBytes(StandardCharsets.UTF_8));
    private static final Set<String> MUTATION_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (MUTATION_METHODS.contains(request.getMethod().toUpperCase())) {
            String userIdHeader = request.getHeader("X-User-Id");
            if (userIdHeader != null && !userIdHeader.isBlank()) {
                try {
                    UUID userId = UUID.fromString(userIdHeader);
                    if (DEMO_USER_ID.equals(userId)) {
                        throw new DemoUserProtectionException("Demo user account is read-only. Please register a free account to customize workouts.");
                    }
                } catch (IllegalArgumentException ignored) {
                }
            }
        }
        return true;
    }
}
