package com.trainingapp.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity representing an application user managed by the auth-service.
 *
 * <p>This entity is never exposed directly from any controller. All outbound
 * representations use {@link com.trainingapp.auth.dto.UserResponse}.
 *
 * <p>The {@code password_hash} column stores a BCrypt hash (cost 12).
 * The plain-text password is never stored or logged.
 */
@Entity
@Table(name = "users", schema = "auth")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Role role = Role.ROLE_USER;

    @Column(name = "theme_mode", length = 20)
    private String themeMode = "light";

    @Column(name = "theme_pos", length = 50)
    private String themePos = "blue";

    @Column(name = "theme_neg", length = 50)
    private String themeNeg = "red";

    /**
     * Sets {@code createdAt} to the current UTC instant before the first persist.
     * Ensures the field is always populated regardless of the caller.
     */
    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    // ----------------------------------------------------------------
    // Getters and setters — no Lombok to avoid JPA proxy pitfalls
    // ----------------------------------------------------------------

    /** Returns the surrogate primary key (UUID v4, assigned by the database). */
    public UUID getId() { return id; }

    /** Returns the unique login name. */
    public String getUsername() { return username; }

    /** Sets the unique login name. */
    public void setUsername(String username) { this.username = username; }

    /** Returns the unique email address. */
    public String getEmail() { return email; }

    /** Sets the unique email address. */
    public void setEmail(String email) { this.email = email; }

    /** Returns the BCrypt password hash. Never expose this to the client. */
    public String getPasswordHash() { return passwordHash; }

    /** Sets the BCrypt password hash. */
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    /** Returns the UTC instant when this account was created. */
    public Instant getCreatedAt() { return createdAt; }

    /** Returns the user role. */
    public Role getRole() { return role; }

    /** Sets the user role. */
    public void setRole(Role role) { this.role = role; }

    public String getThemeMode() { return themeMode; }
    public void setThemeMode(String themeMode) { this.themeMode = themeMode; }

    public String getThemePos() { return themePos; }
    public void setThemePos(String themePos) { this.themePos = themePos; }

    public String getThemeNeg() { return themeNeg; }
    public void setThemeNeg(String themeNeg) { this.themeNeg = themeNeg; }
}
