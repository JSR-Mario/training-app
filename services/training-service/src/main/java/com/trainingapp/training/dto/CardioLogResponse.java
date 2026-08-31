package com.trainingapp.training.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

public record CardioLogResponse(
    UUID id,
    int durationMinutes,
    String cardioType,
    BigDecimal distanceKm,
    LocalDate performedOn,
    Instant createdAt
) {}
