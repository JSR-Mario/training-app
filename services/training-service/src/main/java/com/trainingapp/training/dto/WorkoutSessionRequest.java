package com.trainingapp.training.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import java.util.UUID;

/** Payload for starting a new workout session. */
public record WorkoutSessionRequest(
    @NotNull(message = "Day template ID is required") UUID dayTemplateId,
    @NotNull(message = "Performed date is required") LocalDate performedOn,
    @Min(value = 1, message = "Week number must be at least 1") int weekNumber
) {}
