package com.trainingapp.training.exception;

/**
 * Thrown when a caller attempts to mutate data belonging to the protected Demo User account.
 */
public class DemoUserProtectionException extends RuntimeException {
    public DemoUserProtectionException(String message) {
        super(message);
    }
}
