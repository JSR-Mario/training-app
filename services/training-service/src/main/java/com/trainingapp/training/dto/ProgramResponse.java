package com.trainingapp.training.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import com.trainingapp.training.domain.ProgramGoal;

/** Read-only view of a training program. */
public record ProgramResponse(UUID id, String name, int durationWeeks, LocalDate startDate, boolean isActive, int currentWeek, Instant createdAt, ProgramGoal goal) {}
