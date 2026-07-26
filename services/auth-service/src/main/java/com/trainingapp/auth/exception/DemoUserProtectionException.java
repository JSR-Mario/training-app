package com.trainingapp.auth.exception;

/**
 * Thrown when a caller attempts to mutate profile data for the protected Demo User account.
 */
public class DemoUserProtectionException extends RuntimeException {
    public DemoUserProtectionException(String message) {
        super(message);
    }
}
