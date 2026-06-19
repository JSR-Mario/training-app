package com.trainingapp.auth.exception;

/**
 * Thrown when a requested resource (e.g., a user by ID) does not exist.
 *
 * <p>Mapped to HTTP 404 Not Found by {@link GlobalExceptionHandler}.
 */
public class ResourceNotFoundException extends RuntimeException {

    /**
     * Creates a new exception with the given detail message.
     *
     * @param message human-readable description of what was not found
     */
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
