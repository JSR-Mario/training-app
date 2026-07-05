package com.trainingapp.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for creating or updating an exercise. */
public record ExerciseRequest(
        @NotBlank @Size(max = 200) String name,
        @Size(max = 100) String equipmentBrand,
        boolean unilateral,
        boolean isBodyweight,
        boolean isPublic,
        boolean spinalLoading
) {}
