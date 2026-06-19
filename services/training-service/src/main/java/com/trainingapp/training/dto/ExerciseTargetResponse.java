package com.trainingapp.training.dto;

import com.trainingapp.training.domain.BodyPart;
import java.math.BigDecimal;
import java.util.UUID;

/** Read-only view of an exercise body-part target. */
public record ExerciseTargetResponse(UUID id, BodyPart bodyPart, BigDecimal targetValue) {}
