package com.trainingapp.analytics.dto;

import java.math.BigDecimal;

public record WeeklyVolumeResponse(
    String bodyPart,
    BigDecimal totalSets
) {}
