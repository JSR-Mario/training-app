package com.trainingapp.training.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity that persists a user's all-time accumulated workout volume (XP)
 * for the level progression system.
 *
 * <p>One row per user. Rows are created lazily on the first dashboard load
 * by {@link com.trainingapp.training.service.ExperienceService#getOrInitialize}.
 *
 * <p>The {@code total_xp} field stores the sum of
 * {@code weight_kg * (reps_completed + COALESCE(reps_completed_right, 0))}
 * across all completed workout sets for this user.
 */
@Entity
@Table(name = "user_experience", schema = "training")
public class UserExperience {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID userId;

    @Column(nullable = false, precision = 20, scale = 2)
    private BigDecimal totalXp = BigDecimal.ZERO;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    public UserExperience() {}

    /** Creates a new record for the given user with the supplied initial XP. */
    public UserExperience(UUID userId, BigDecimal totalXp) {
        this.userId = userId;
        this.totalXp = totalXp;
        this.updatedAt = Instant.now();
    }

    /** Keeps {@code updatedAt} in sync whenever this entity is modified. */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    /** Returns the user identifier (primary key). */
    public UUID getUserId() { return userId; }

    /** Returns the all-time accumulated XP (workout volume in kg). */
    public BigDecimal getTotalXp() { return totalXp; }

    /** Sets the all-time accumulated XP. */
    public void setTotalXp(BigDecimal totalXp) { this.totalXp = totalXp; }

    /** Returns the timestamp of the last XP update. */
    public Instant getUpdatedAt() { return updatedAt; }
}
