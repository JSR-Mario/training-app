package com.trainingapp.training.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import java.util.UUID;

/** Payload for logging or updating a workout set. */
public record WorkoutSetRequest(
    @NotNull(message = "Session exercise ID is required") UUID sessionExerciseId,
    @Min(value = 1, message = "Set number must be at least 1") int setNumber,
    @Min(value = 0, message = "Reps completed cannot be negative") Integer repsCompleted,
    @Min(value = 0, message = "Right reps completed cannot be negative") Integer repsCompletedRight,
    @Min(value = 0, message = "Weight cannot be negative") BigDecimal weightKg
) {}
