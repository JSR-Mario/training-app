package com.trainingapp.training.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;

/** A single item in a reorder batch: pairs a day-exercise ID with its new sort order. */
public record ReorderItem(@NotNull UUID id, @PositiveOrZero int sortOrder) {}
