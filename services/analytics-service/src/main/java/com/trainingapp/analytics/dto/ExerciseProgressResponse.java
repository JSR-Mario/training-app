package com.trainingapp.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExerciseProgressResponse(
    @com.fasterxml.jackson.annotation.JsonProperty("sessionDate") LocalDate sessionDate,
    @com.fasterxml.jackson.annotation.JsonProperty("weekNumber") Integer weekNumber,
    @com.fasterxml.jackson.annotation.JsonProperty("dayTemplateId") java.util.UUID dayTemplateId,
    @com.fasterxml.jackson.annotation.JsonProperty("maxWeightKg") BigDecimal maxWeightKg,
    @com.fasterxml.jackson.annotation.JsonProperty("maxWeightReps") Integer maxWeightReps,
    @com.fasterxml.jackson.annotation.JsonProperty("totalVolumeKg") BigDecimal totalVolumeKg,
    @com.fasterxml.jackson.annotation.JsonProperty("bestSetVolumeWeightKg") BigDecimal bestSetVolumeWeightKg,
    @com.fasterxml.jackson.annotation.JsonProperty("bestSetVolumeReps") Integer bestSetVolumeReps,
    @com.fasterxml.jackson.annotation.JsonProperty("totalSets") int totalSets
) {}
