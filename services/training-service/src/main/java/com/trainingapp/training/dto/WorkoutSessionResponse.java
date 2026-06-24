package com.trainingapp.training.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Read-only view of a workout session. */
public record WorkoutSessionResponse(
    UUID id,
    UUID dayTemplateId,
    String dayTemplateName,
    LocalDate performedOn,
    int weekNumber,
    Instant completedAt,
    String notes,
    List<SessionRatingResponse> ratings
) {}
