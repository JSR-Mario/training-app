package com.trainingapp.training.config;

import org.springframework.security.authentication.AbstractAuthenticationToken;

import java.util.List;
import java.util.UUID;

/**
 * A lightweight authentication token carrying only the user ID extracted from
 * the {@code X-User-Id} header set by the API gateway.
 *
 * <p>This token is created by {@link UserIdAuthenticationFilter} and stored in
 * the Spring Security {@link org.springframework.security.core.context.SecurityContext}.
 * It has no granted authorities because authorization is not enforced at the
 * service level — the gateway handles JWT validation and RBAC.
 */
public class UserIdAuthenticationToken extends AbstractAuthenticationToken {

    private final UUID userId;

    /**
     * Creates an authenticated token carrying the given user ID.
     *
     * @param userId the UUID extracted from the {@code X-User-Id} header
     */
    public UserIdAuthenticationToken(UUID userId) {
        super(List.of());
        this.userId = userId;
        setAuthenticated(true);
    }

    /**
     * Returns {@code null} — there are no credentials in this token.
     *
     * @return always {@code null}
     */
    @Override
    public Object getCredentials() {
        return null;
    }

    /**
     * Returns the user ID as the principal.
     *
     * @return the {@link UUID} of the authenticated user
     */
    @Override
    public UUID getPrincipal() {
        return userId;
    }
}
