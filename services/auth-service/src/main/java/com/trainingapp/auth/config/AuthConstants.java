package com.trainingapp.auth.config;

/**
 * Application-wide constants for the auth-service.
 *
 * <p>All magic values used in authentication logic (cookie names, claim keys,
 * BCrypt cost) are centralised here to prevent duplication and silent drift.
 */
public final class AuthConstants {

    /** BCrypt work factor. Cost 12 is the project-wide standard. */
    public static final int BCRYPT_COST = 12;

    /** Name of the HttpOnly cookie that carries the refresh token. */
    public static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

    /**
     * Cookie path: only sent to the auth refresh and logout endpoints,
     * reducing the surface over which the cookie is transmitted.
     */
    public static final String REFRESH_TOKEN_COOKIE_PATH = "/api/v1/auth";

    /** JWT claim key used to distinguish access tokens from refresh tokens. */
    public static final String TOKEN_TYPE_CLAIM = "type";

    /** Value of {@link #TOKEN_TYPE_CLAIM} for short-lived access tokens. */
    public static final String TOKEN_TYPE_ACCESS = "access";

    /** Value of {@link #TOKEN_TYPE_CLAIM} for long-lived refresh tokens. */
    public static final String TOKEN_TYPE_REFRESH = "refresh";

    private AuthConstants() {
        // Utility class — not instantiable.
    }
}
