package com.trainingapp.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExerciseProgressResponse(
    LocalDate sessionDate,
    Integer weekNumber,
    java.util.UUID dayTemplateId,
    BigDecimal maxWeightKg,
    Integer maxWeightReps,
    BigDecimal totalVolumeKg,
    BigDecimal bestSetVolumeWeightKg,
    Integer bestSetVolumeReps,
    int totalSets
) {}
