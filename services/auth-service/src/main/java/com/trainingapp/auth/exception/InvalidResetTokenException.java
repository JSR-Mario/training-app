package com.trainingapp.auth.exception;

/**
 * Exception thrown when a password reset token is invalid, expired, or already used.
 * Maps to HTTP 400 Bad Request to avoid client authentication/refresh loops.
 */
public class InvalidResetTokenException extends RuntimeException {

    public InvalidResetTokenException(String message) {
        super(message);
    }
}
