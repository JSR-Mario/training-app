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

/** Rating (1-10) for a specific exercise during a specific session. */
@Entity
@Table(name = "workout_session_exercise_ratings", schema = "training")
public class SessionExerciseRating {

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

    @Column(nullable = false)
    private int rating;

    public UUID getId() { return id; }
    public WorkoutSession getSession() { return session; }
    public void setSession(WorkoutSession session) { this.session = session; }
    public SessionExercise getSessionExercise() { return sessionExercise; }
    public void setSessionExercise(SessionExercise sessionExercise) { this.sessionExercise = sessionExercise; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
}
