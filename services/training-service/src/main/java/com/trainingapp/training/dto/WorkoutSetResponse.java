package com.trainingapp.training.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Read-only view of a workout set. */
public record WorkoutSetResponse(
    UUID id,
    UUID sessionId,
    UUID dayExerciseId,
    int setNumber,
    int repsCompleted,
    BigDecimal weightKg,
    Instant loggedAt
) {}
