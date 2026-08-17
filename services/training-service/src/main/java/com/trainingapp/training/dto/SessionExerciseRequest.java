package com.trainingapp.training.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SessionExerciseRequest(
    @NotNull(message = "Exercise ID is required") UUID exerciseId,
    Integer sets,
    Integer reps,
    Integer repsMax,
    boolean isAmrap,
    Boolean saveToDayTemplate
) {
    public SessionExerciseRequest(UUID exerciseId, Integer sets, Integer reps, Integer repsMax, boolean isAmrap) {
        this(exerciseId, sets, reps, repsMax, isAmrap, false);
    }
}
