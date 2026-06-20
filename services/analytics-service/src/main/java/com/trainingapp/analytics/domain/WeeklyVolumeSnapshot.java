package com.trainingapp.analytics.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Pre-calculated snapshot of the total volume (sets) performed for a specific
 * body part, by a user, during a specific week of a program.
 */
@Entity
@Table(name = "weekly_volume_snapshots", schema = "analytics")
public class WeeklyVolumeSnapshot {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "program_id", nullable = false, updatable = false)
    private UUID programId;

    @Column(name = "week_number", nullable = false, updatable = false)
    private int weekNumber;

    @Column(name = "body_part", nullable = false, updatable = false, length = 30)
    private String bodyPart;

    @Column(name = "total_sets", nullable = false, precision = 7, scale = 2)
    private BigDecimal totalSets = BigDecimal.ZERO;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getProgramId() { return programId; }
    public void setProgramId(UUID programId) { this.programId = programId; }
    public int getWeekNumber() { return weekNumber; }
    public void setWeekNumber(int weekNumber) { this.weekNumber = weekNumber; }
    public String getBodyPart() { return bodyPart; }
    public void setBodyPart(String bodyPart) { this.bodyPart = bodyPart; }
    public BigDecimal getTotalSets() { return totalSets; }
    public void setTotalSets(BigDecimal totalSets) { this.totalSets = totalSets; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
