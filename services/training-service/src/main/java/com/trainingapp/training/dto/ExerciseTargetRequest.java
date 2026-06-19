package com.trainingapp.training.dto;

import com.trainingapp.training.domain.BodyPart;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

/** Request body for creating or updating an exercise body-part target. */
public record ExerciseTargetRequest(
        @NotNull BodyPart bodyPart,
        @NotNull @Positive BigDecimal targetValue
) {}
