package com.trainingapp.training.dto;

import jakarta.validation.constraints.Min;

public record SessionExerciseUpdateRequest(
    @Min(value = 1, message = "Sets must be at least 1")
    Integer sets,
    Integer reps,
    Integer repsMax,
    boolean isAmrap,
    Boolean saveToDayTemplate
) {}
