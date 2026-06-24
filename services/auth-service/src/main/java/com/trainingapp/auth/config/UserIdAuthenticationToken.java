package com.trainingapp.auth.config;

import org.springframework.security.authentication.AbstractAuthenticationToken;

import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * A lightweight authentication token carrying only the user ID extracted from
 * the {@code X-User-Id} header set by the API gateway.
 *
 * <p>This token is created by {@link UserIdAuthenticationFilter} and stored in
 * the Spring Security {@link org.springframework.security.core.context.SecurityContext}.
 * It supports roles passed from the gateway.
 */
public class UserIdAuthenticationToken extends AbstractAuthenticationToken {

    private final UUID userId;

    /**
     * Creates an authenticated token carrying the given user ID and authorities.
     *
     * @param userId      the UUID extracted from the {@code X-User-Id} header
     * @param authorities the roles extracted from the {@code X-User-Role} header
     */
    public UserIdAuthenticationToken(UUID userId, Collection<? extends GrantedAuthority> authorities) {
        super(authorities);
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
