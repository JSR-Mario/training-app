package com.trainingapp.training.dto;

import java.util.UUID;

/** Read-only view of a week template. */
public record WeekTemplateResponse(UUID id, UUID programId, String name) {}
