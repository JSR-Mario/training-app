package com.trainingapp.training.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** 
 * Event payload sent to the analytics service when a workout session is completed. 
 */
public record SessionCompletedEvent(
    UUID sessionId,
    UUID userId,
    UUID programId,
    int weekNumber,
    UUID dayTemplateId,
    LocalDate performedOn,
    List<SetData> sets
) {
    /** Simplified set data needed for analytics calculation. */
    public record SetData(
        @com.fasterxml.jackson.annotation.JsonProperty("exerciseId") UUID exerciseId,
        @com.fasterxml.jackson.annotation.JsonProperty("repsCompleted") int repsCompleted,
        @com.fasterxml.jackson.annotation.JsonProperty("repsCompletedRight") Integer repsCompletedRight,
        @com.fasterxml.jackson.annotation.JsonProperty("weightKg") java.math.BigDecimal weightKg,
        @com.fasterxml.jackson.annotation.JsonProperty("bodyPartMultipliers") java.util.Map<String, java.math.BigDecimal> bodyPartMultipliers
    ) {}
}
