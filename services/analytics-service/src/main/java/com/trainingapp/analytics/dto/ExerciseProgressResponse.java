package com.trainingapp.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExerciseProgressResponse(
    LocalDate sessionDate,
    BigDecimal maxWeightKg,
    BigDecimal totalVolumeKg,
    int totalSets
) {}
