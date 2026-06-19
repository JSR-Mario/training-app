package com.trainingapp.training.exception;

/** Thrown when a user tries to access a resource they do not own. Mapped to HTTP 403. */
public class AccessDeniedException extends RuntimeException {
    public AccessDeniedException(String message) { super(message); }
}
