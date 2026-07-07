package com.trainingapp.training.dto;

import java.util.UUID;

/** Read-only view of an exercise assigned to a day template. */
public record DayExerciseResponse(
        UUID id,
        UUID exerciseId,
        String exerciseName,
        Integer sets,
        Integer reps,
        Integer repsMax,
        int sortOrder,
        boolean isAmrap,
        boolean unilateral,
        boolean isBodyweight
) {}
