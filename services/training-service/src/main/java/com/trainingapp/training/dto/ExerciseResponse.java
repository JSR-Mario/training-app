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
        boolean isBodyweight,
        boolean isPublic,
        boolean spinalLoading,
        Instant createdAt,
        List<ExerciseTargetResponse> targets,
        Double averageRating,
        List<ExercisePrResponse> personalRecords
) {}
