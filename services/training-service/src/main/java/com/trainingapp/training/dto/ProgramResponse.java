package com.trainingapp.training.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import com.trainingapp.training.domain.ProgramGoal;

/**
 * Read-only view of a training program with ratings, description, and metadata.
 */
public record ProgramResponse(
        UUID id,
        UUID userId,
        String name,
        String description,
        int durationWeeks,
        LocalDate startDate,
        boolean isActive,
        int currentWeek,
        Instant createdAt,
        ProgramGoal goal,
        boolean isPublic,
        UUID sourceProgramId,
        Double averageRating,
        int ratingsCount,
        Integer userRating
) {}
