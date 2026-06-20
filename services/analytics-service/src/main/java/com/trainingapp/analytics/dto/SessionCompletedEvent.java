package com.trainingapp.analytics.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** 
 * Event payload received from the training-service when a workout session is completed.
 * It contains the necessary target multipliers within the SetData.
 */
public record SessionCompletedEvent(
    UUID sessionId,
    UUID userId,
    UUID programId,
    int weekNumber,
    LocalDate performedOn,
    List<SetData> sets
) {
    public record SetData(
        UUID exerciseId,
        int repsCompleted,
        java.math.BigDecimal weightKg,
        java.util.Map<String, java.math.BigDecimal> bodyPartMultipliers
    ) {}
}
