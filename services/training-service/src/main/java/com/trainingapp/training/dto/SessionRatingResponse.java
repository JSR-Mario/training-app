package com.trainingapp.training.dto;

import java.util.UUID;

public record SessionRatingResponse(
    UUID id,
    UUID dayExerciseId,
    int rating
) {}
