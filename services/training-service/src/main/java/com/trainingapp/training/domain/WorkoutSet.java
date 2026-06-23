package com.trainingapp.training.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * One logged set within a {@link WorkoutSession}.
 */
@Entity
@Table(name = "workout_sets", schema = "training")
public class WorkoutSet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false, updatable = false)
    private WorkoutSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "day_exercise_id", nullable = false, updatable = false)
    private DayExercise dayExercise;

    @Column(name = "set_number", nullable = false)
    private int setNumber;

    @Column(name = "reps_completed")
    private Integer repsCompleted;

    @Column(name = "weight_kg")
    private BigDecimal weightKg;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "incline", precision = 5, scale = 2)
    private BigDecimal incline;

    @Column(name = "resistance", precision = 5, scale = 2)
    private BigDecimal resistance;

    @Column(name = "logged_at", nullable = false, updatable = false)
    private Instant loggedAt;

    @PrePersist
    protected void onCreate() {
        if (this.loggedAt == null) {
            this.loggedAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public WorkoutSession getSession() { return session; }
    public void setSession(WorkoutSession session) { this.session = session; }
    public DayExercise getDayExercise() { return dayExercise; }
    public void setDayExercise(DayExercise dayExercise) { this.dayExercise = dayExercise; }
    public int getSetNumber() { return setNumber; }
    public void setSetNumber(int setNumber) { this.setNumber = setNumber; }
    public Integer getRepsCompleted() { return repsCompleted; }
    public void setRepsCompleted(Integer repsCompleted) { this.repsCompleted = repsCompleted; }
    public BigDecimal getWeightKg() { return weightKg; }
    public void setWeightKg(BigDecimal weightKg) { this.weightKg = weightKg; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public BigDecimal getIncline() { return incline; }
    public void setIncline(BigDecimal incline) { this.incline = incline; }
    public BigDecimal getResistance() { return resistance; }
    public void setResistance(BigDecimal resistance) { this.resistance = resistance; }
    public Instant getLoggedAt() { return loggedAt; }
    public void setLoggedAt(Instant loggedAt) { this.loggedAt = loggedAt; }
}
