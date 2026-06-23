package com.trainingapp.training.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;

/** Request body for adding or updating an exercise within a day template. */
public record DayExerciseRequest(
        @NotNull UUID exerciseId,
        @Positive int sets,
        @Positive int reps,
        @PositiveOrZero Integer repsMax,
        @PositiveOrZero int sortOrder
) {}
