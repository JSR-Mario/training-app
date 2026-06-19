package com.trainingapp.auth.exception;

/**
 * Thrown when a client attempts to create a resource that conflicts with
 * an existing unique value (e.g., duplicate username or email).
 *
 * <p>Mapped to HTTP 409 Conflict by {@link GlobalExceptionHandler}.
 */
public class DuplicateResourceException extends RuntimeException {

    /**
     * Creates a new exception with the given detail message.
     *
     * @param message human-readable description of the conflict
     */
    public DuplicateResourceException(String message) {
        super(message);
    }
}
