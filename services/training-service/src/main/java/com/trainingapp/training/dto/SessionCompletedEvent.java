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
        UUID exerciseId,
        int repsCompleted,
        Integer repsCompletedRight,
        java.math.BigDecimal weightKg,
        java.util.Map<String, java.math.BigDecimal> bodyPartMultipliers
    ) {}
}
