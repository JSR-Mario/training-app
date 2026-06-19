package com.trainingapp.auth.exception;

/**
 * Thrown when a JWT token is missing, malformed, expired, or has an invalid type.
 *
 * <p>Mapped to HTTP 401 Unauthorized by {@link GlobalExceptionHandler}.
 */
public class InvalidTokenException extends RuntimeException {

    /**
     * Creates a new exception with the given detail message.
     *
     * @param message human-readable description of the token problem
     */
    public InvalidTokenException(String message) {
        super(message);
    }
}
