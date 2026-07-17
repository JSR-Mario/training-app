package com.trainingapp.training.dto;

import java.math.BigDecimal;

public record PreviousSetSuggestion(
    Integer setNumber,
    BigDecimal weightKg,
    Integer reps
) {}
