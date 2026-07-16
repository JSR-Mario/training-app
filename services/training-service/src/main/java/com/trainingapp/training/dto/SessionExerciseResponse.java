package com.trainingapp.training.dto;

import java.util.UUID;

public record SessionExerciseResponse(
    UUID id,
    UUID sessionId,
    ExerciseResponse exercise,
    Integer sets,
    Integer reps,
    Integer repsMax,
    int sortOrder,
    boolean isAmrap
) {}
