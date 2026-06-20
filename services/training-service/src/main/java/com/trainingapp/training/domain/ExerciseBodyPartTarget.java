package com.trainingapp.training.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Maps an {@link Exercise} to a {@link BodyPart} with a target value indicating
 * how much the exercise "hits" that body part.
 *
 * <p>For example, a bench press might have targets: CHEST=1.0, TRICEPS=0.5.
 * The unique constraint {@code (exercise_id, body_part)} prevents duplicate
 * body part assignments for the same exercise.
 */
@Entity
@Table(name = "exercise_targets", schema = "training")
public class ExerciseBodyPartTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Enumerated(EnumType.STRING)
    @Column(name = "body_part", nullable = false, length = 30)
    private BodyPart bodyPart;

    @Column(name = "target_value", nullable = false, precision = 5, scale = 2)
    private BigDecimal targetValue;

    public UUID getId() { return id; }
    public Exercise getExercise() { return exercise; }
    public void setExercise(Exercise exercise) { this.exercise = exercise; }
    public BodyPart getBodyPart() { return bodyPart; }
    public void setBodyPart(BodyPart bodyPart) { this.bodyPart = bodyPart; }
    public BigDecimal getTargetValue() { return targetValue; }
    public void setTargetValue(BigDecimal targetValue) { this.targetValue = targetValue; }
}
