package com.trainingapp.training.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Read-only view of an {@link com.trainingapp.training.domain.Exercise}. */
public record ExerciseResponse(
        UUID id,
        String name,
        String equipmentBrand,
        boolean unilateral,
        boolean isPublic,
        com.trainingapp.training.domain.ExerciseType type,
        Instant createdAt,
        List<ExerciseTargetResponse> targets,
        Double averageRating
) {}
