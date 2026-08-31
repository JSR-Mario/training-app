package com.trainingapp.training.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CardioLogRequest(
    @NotNull(message = "Duration is required")
    @Min(value = 1, message = "Duration must be at least 1 minute")
    Integer durationMinutes,
    
    String cardioType,

    @DecimalMin(value = "0.01", message = "Distance must be greater than 0")
    BigDecimal distanceKm,
    
    @NotNull(message = "Date is required")
    LocalDate performedOn
) {}
