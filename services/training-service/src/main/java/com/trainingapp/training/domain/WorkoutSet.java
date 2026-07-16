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
    @JoinColumn(name = "session_exercise_id", nullable = false, updatable = false)
    private SessionExercise sessionExercise;

    @Column(name = "set_number", nullable = false)
    private int setNumber;

    @Column(name = "reps_completed")
    private Integer repsCompleted;

    @Column(name = "reps_completed_right")
    private Integer repsCompletedRight;

    @Column(name = "weight_kg")
    private BigDecimal weightKg;

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
    public SessionExercise getSessionExercise() { return sessionExercise; }
    public void setSessionExercise(SessionExercise sessionExercise) { this.sessionExercise = sessionExercise; }
    public int getSetNumber() { return setNumber; }
    public void setSetNumber(int setNumber) { this.setNumber = setNumber; }
    public Integer getRepsCompleted() { return repsCompleted; }
    public void setRepsCompleted(Integer repsCompleted) { this.repsCompleted = repsCompleted; }
    public Integer getRepsCompletedRight() { return repsCompletedRight; }
    public void setRepsCompletedRight(Integer repsCompletedRight) { this.repsCompletedRight = repsCompletedRight; }
    public BigDecimal getWeightKg() { return weightKg; }
    public void setWeightKg(BigDecimal weightKg) { this.weightKg = weightKg; }
    public Instant getLoggedAt() { return loggedAt; }
    public void setLoggedAt(Instant loggedAt) { this.loggedAt = loggedAt; }
}
