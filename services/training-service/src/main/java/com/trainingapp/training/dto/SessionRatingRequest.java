package com.trainingapp.training.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SessionRatingRequest(
    @NotNull @Min(1) @Max(10) Integer rating
) {}
