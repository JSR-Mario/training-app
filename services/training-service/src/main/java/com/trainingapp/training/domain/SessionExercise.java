package com.trainingapp.training.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * An exercise assigned to a specific {@link WorkoutSession}.
 */
@Entity
@Table(name = "session_exercises", schema = "training")
public class SessionExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private WorkoutSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "sets")
    private Integer sets;

    @Column(name = "reps")
    private Integer reps;

    @Column(name = "reps_max")
    private Integer repsMax;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_amrap", nullable = false)
    private boolean isAmrap = false;

    public UUID getId() { return id; }
    public WorkoutSession getSession() { return session; }
    public void setSession(WorkoutSession session) { this.session = session; }
    public Exercise getExercise() { return exercise; }
    public void setExercise(Exercise exercise) { this.exercise = exercise; }
    public Integer getSets() { return sets; }
    public void setSets(Integer sets) { this.sets = sets; }
    public Integer getReps() { return reps; }
    public void setReps(Integer reps) { this.reps = reps; }
    public Integer getRepsMax() { return repsMax; }
    public void setRepsMax(Integer repsMax) { this.repsMax = repsMax; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isAmrap() { return isAmrap; }
    public void setAmrap(boolean amrap) { isAmrap = amrap; }
}
