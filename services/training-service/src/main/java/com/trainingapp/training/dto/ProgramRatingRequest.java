package com.trainingapp.training.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Request payload for submitting a program rating.
 */
public record ProgramRatingRequest(
        @Min(1) @Max(10) int rating
) {}
