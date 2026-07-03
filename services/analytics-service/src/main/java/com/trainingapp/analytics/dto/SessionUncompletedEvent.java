package com.trainingapp.analytics.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;

/** 
 * Event payload received from the training-service when a workout session is uncompleted.
 * It contains the necessary target multipliers within the SetData.
 */
public record SessionUncompletedEvent(
    @NotNull UUID sessionId,
    @NotNull UUID userId,
    @NotNull UUID programId,
    @NotNull Integer weekNumber,
    @NotNull UUID dayTemplateId,
    @NotNull LocalDate performedOn,
    @NotEmpty List<SetData> sets
) {
    public record SetData(
        UUID exerciseId,
        int repsCompleted,
        Integer repsCompletedRight,
        java.math.BigDecimal weightKg,
        java.util.Map<String, java.math.BigDecimal> bodyPartMultipliers
    ) {}
}
