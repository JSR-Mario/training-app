package com.trainingapp.training.dto;

import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

public record CardioLogResponse(
    UUID id,
    int durationMinutes,
    String cardioType,
    LocalDate performedOn,
    Instant createdAt
) {}
