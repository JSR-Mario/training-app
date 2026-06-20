package com.trainingapp.analytics.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * Utility class for accessing the authenticated user's ID from the
 * Spring Security {@link SecurityContextHolder}.
 *
 * <p>The user ID is populated by {@link UserIdAuthenticationFilter}, which
 * reads the {@code X-User-Id} header injected by the API gateway after
 * JWT validation.
 *
 * <p>This class provides a clean, centralized access point so that service
 * and controller classes do not need to interact with the security context
 * directly.
 */
public final class UserContext {

    private UserContext() {
        // Utility class — not instantiable.
    }

    /**
     * Returns the UUID of the currently authenticated user.
     *
     * @return the user's UUID
     * @throws IllegalStateException if no authenticated user is present in the
     *                               security context (i.e., the request was not
     *                               routed through the API gateway)
     */
    public static UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof UserIdAuthenticationToken token) {
            return token.getPrincipal();
        }
        throw new IllegalStateException(
                "No authenticated user found in the security context. "
                + "Ensure requests are routed through the API gateway.");
    }
}
