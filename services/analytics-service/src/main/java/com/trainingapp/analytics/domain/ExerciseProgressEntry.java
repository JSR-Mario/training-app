package com.trainingapp.analytics.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Pre-calculated daily snapshot of progression for a specific exercise and user.
 */
@Entity
@Table(name = "exercise_progress", schema = "analytics")
public class ExerciseProgressEntry {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "exercise_id", nullable = false, updatable = false)
    private UUID exerciseId;

    @Column(name = "session_date", nullable = false, updatable = false)
    private LocalDate sessionDate;

    @Column(name = "week_number")
    private Integer weekNumber;

    @Column(name = "day_template_id")
    private UUID dayTemplateId;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(name = "max_weight_kg", nullable = false, precision = 6, scale = 2)
    private BigDecimal maxWeightKg = BigDecimal.ZERO;

    @Column(name = "total_volume_kg", nullable = false, precision = 8, scale = 2)
    private BigDecimal totalVolumeKg = BigDecimal.ZERO;

    @Column(name = "total_sets", nullable = false)
    private int totalSets = 0;

    @Column(name = "max_weight_reps", nullable = false)
    private int maxWeightReps = 0;

    @Column(name = "best_set_volume_weight_kg", nullable = false, precision = 6, scale = 2)
    private BigDecimal bestSetVolumeWeightKg = BigDecimal.ZERO;

    @Column(name = "best_set_volume_reps", nullable = false)
    private int bestSetVolumeReps = 0;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getExerciseId() { return exerciseId; }
    public void setExerciseId(UUID exerciseId) { this.exerciseId = exerciseId; }
    public LocalDate getSessionDate() { return sessionDate; }
    public void setSessionDate(LocalDate sessionDate) { this.sessionDate = sessionDate; }
    public BigDecimal getMaxWeightKg() { return maxWeightKg; }
    public void setMaxWeightKg(BigDecimal maxWeightKg) { this.maxWeightKg = maxWeightKg; }
    public BigDecimal getTotalVolumeKg() { return totalVolumeKg; }
    public void setTotalVolumeKg(BigDecimal totalVolumeKg) { this.totalVolumeKg = totalVolumeKg; }
    public int getTotalSets() { return totalSets; }
    public void setTotalSets(int totalSets) { this.totalSets = totalSets; }
    public int getMaxWeightReps() { return maxWeightReps; }
    public void setMaxWeightReps(int maxWeightReps) { this.maxWeightReps = maxWeightReps; }
    public BigDecimal getBestSetVolumeWeightKg() { return bestSetVolumeWeightKg; }
    public void setBestSetVolumeWeightKg(BigDecimal bestSetVolumeWeightKg) { this.bestSetVolumeWeightKg = bestSetVolumeWeightKg; }
    public int getBestSetVolumeReps() { return bestSetVolumeReps; }
    public void setBestSetVolumeReps(int bestSetVolumeReps) { this.bestSetVolumeReps = bestSetVolumeReps; }
    public Integer getWeekNumber() { return weekNumber; }
    public void setWeekNumber(Integer weekNumber) { this.weekNumber = weekNumber; }
    public UUID getDayTemplateId() { return dayTemplateId; }
    public void setDayTemplateId(UUID dayTemplateId) { this.dayTemplateId = dayTemplateId; }
    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }
}
