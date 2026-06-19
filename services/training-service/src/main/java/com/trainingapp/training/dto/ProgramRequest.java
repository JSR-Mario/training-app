package com.trainingapp.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Request body for creating or updating a training program. */
public record ProgramRequest(
        @NotBlank @Size(max = 200) String name,
        @Positive int durationWeeks,
        LocalDate startDate
) {}
