package com.trainingapp.training.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SessionExerciseRequest(
    @NotNull(message = "Exercise ID is required") UUID exerciseId,
    Integer sets,
    Integer reps,
    Integer repsMax,
    boolean isAmrap
) {}
