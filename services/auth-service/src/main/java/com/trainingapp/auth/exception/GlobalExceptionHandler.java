package com.trainingapp.auth.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestCookieException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * Centralized exception handler for the auth-service.
 *
 * <p>All exceptions are mapped to RFC 7807 {@link ProblemDetail} responses.
 * Stack traces, SQL errors, and internal field names are never exposed to the
 * client — only sanitized, human-readable messages are returned.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles duplicate username or email on registration.
     *
     * @param ex the duplicate resource exception
     * @return 409 Conflict with RFC 7807 body
     */
    @ExceptionHandler(DuplicateResourceException.class)
    public ProblemDetail handleDuplicateResource(DuplicateResourceException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Resource Already Exists");
        return problem;
    }

    /**
     * Handles invalid, expired, or missing tokens on the refresh endpoint.
     *
     * @param ex the invalid token exception
     * @return 401 Unauthorized with RFC 7807 body
     */
    @ExceptionHandler(InvalidTokenException.class)
    public ProblemDetail handleInvalidToken(InvalidTokenException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problem.setTitle("Invalid Token");
        return problem;
    }

    /**
     * Handles user not found by ID (e.g., on the {@code /me} endpoint).
     *
     * @param ex the resource not found exception
     * @return 404 Not Found with RFC 7807 body
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleResourceNotFound(ResourceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Resource Not Found");
        return problem;
    }

    /**
     * Handles invalid username or password on login.
     *
     * @param ex Spring Security's bad credentials exception
     * @return 401 Unauthorized with a generic message (no credential hints)
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ProblemDetail handleBadCredentials(BadCredentialsException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED, "Invalid username or password.");
        problem.setTitle("Authentication Failed");
        return problem;
    }

    /**
     * Handles missing {@code refresh_token} cookie on the refresh endpoint.
     *
     * @param ex Spring's missing cookie exception
     * @return 401 Unauthorized
     */
    @ExceptionHandler(MissingRequestCookieException.class)
    public ProblemDetail handleMissingCookie(MissingRequestCookieException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED, "Refresh token cookie is missing.");
        problem.setTitle("Authentication Required");
        return problem;
    }

    /**
     * Handles {@code @Valid} constraint violations on request bodies.
     * Returns each field's constraint message without exposing internal names.
     *
     * @param ex Spring's method argument validation exception
     * @return 400 Bad Request with a summary of constraint violations
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationFailure(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
        problem.setTitle("Validation Failed");
        return problem;
    }

    /**
     * Catch-all handler for any unhandled exception.
     * Logs the full exception internally but returns a generic message to the client.
     *
     * @param ex the unexpected exception
     * @return 500 Internal Server Error with no internal details
     */
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.");
        problem.setTitle("Internal Server Error");
        return problem;
    }
}
