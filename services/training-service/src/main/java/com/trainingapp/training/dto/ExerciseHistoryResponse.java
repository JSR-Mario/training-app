package com.trainingapp.training.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ExerciseHistoryResponse(
    UUID setId,
    LocalDate performedOn,
    Integer durationMinutes,
    BigDecimal incline,
    BigDecimal resistance,
    Integer repsCompleted,
    BigDecimal weightKg
) {}
