package com.trainingapp.training.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Request body for creating or updating a training program. */
public record ProgramRequest(
        @NotBlank @Size(max = 200) String name,
        @Min(1) @Max(52) int durationWeeks,
        LocalDate startDate,
        boolean isActive,
        @Min(1) @Max(52) Integer currentWeek
) {}
