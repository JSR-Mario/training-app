package com.trainingapp.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Aggregated volume for a single workout session, grouped by day template.
 *
 * <p>Used by the Volume History chart to display total volume per session date,
 * regardless of which exercises are currently configured for that day.
 *
 * @param sessionDate    the date the session was performed
 * @param sessionId      UUID of the workout session (used for chart highlight)
 * @param weekNumber     the program week number of the session
 * @param totalVolumeKg  sum of (weight × reps) for every exercise in that session
 */
public record DayVolumeResponse(
    LocalDate sessionDate,
    UUID sessionId,
    Integer weekNumber,
    BigDecimal totalVolumeKg
) {}
