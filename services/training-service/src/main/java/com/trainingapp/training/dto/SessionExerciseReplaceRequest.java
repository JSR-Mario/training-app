package com.trainingapp.training.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SessionExerciseReplaceRequest(
    @NotNull(message = "New exercise ID is required")
    UUID newExerciseId,
    Integer sets,
    Integer reps,
    Integer repsMax,
    Boolean isAmrap
) {}
