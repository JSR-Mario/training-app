package com.trainingapp.training.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record BodyWeightResponse(
    UUID id,
    LocalDate date,
    BigDecimal weightKg
) {}
