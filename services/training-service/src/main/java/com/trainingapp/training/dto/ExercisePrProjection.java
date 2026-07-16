package com.trainingapp.training.dto;

import java.math.BigDecimal;
import java.util.UUID;

public interface ExercisePrProjection {
    UUID getExerciseId();
    BigDecimal getPrWeight();
    Integer getPrReps();
    String getBucket();
}
