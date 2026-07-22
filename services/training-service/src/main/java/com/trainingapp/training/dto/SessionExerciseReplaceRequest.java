package com.trainingapp.training.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SessionExerciseReplaceRequest(
    @NotNull(message = "New exercise ID is required")
    UUID newExerciseId
) {}
