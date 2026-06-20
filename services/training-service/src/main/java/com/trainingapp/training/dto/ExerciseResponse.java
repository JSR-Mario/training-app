package com.trainingapp.training.dto;

import java.time.Instant;
import java.util.UUID;

/** Read-only view of an {@link com.trainingapp.training.domain.Exercise}. */
public record ExerciseResponse(UUID id, String name, Instant createdAt) {}
