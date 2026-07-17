package com.trainingapp.training.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ExerciseSuggestionResponse(
    UUID dayExerciseId,
    UUID exerciseId,
    BigDecimal suggestedWeightKg,
    Integer suggestedReps,
    boolean hadFatigueLastWeek,
    List<PreviousSetSuggestion> previousSets
) {}
