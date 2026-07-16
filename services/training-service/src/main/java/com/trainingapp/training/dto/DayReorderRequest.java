package com.trainingapp.training.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record DayReorderRequest(
    @NotNull(message = "Day template ID is required")
    UUID id,

    @Min(value = 1, message = "Sort order must be at least 1")
    int sortOrder
) {}
