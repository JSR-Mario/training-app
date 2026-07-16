package com.trainingapp.training.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SessionExerciseReorderRequest(
    @NotNull(message = "Session exercise ID is required") UUID id,
    int sortOrder
) {}
