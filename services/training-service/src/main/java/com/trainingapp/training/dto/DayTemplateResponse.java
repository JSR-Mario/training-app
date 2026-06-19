package com.trainingapp.training.dto;

import java.util.UUID;

/** Read-only view of a day template. */
public record DayTemplateResponse(UUID id, UUID weekTemplateId, String name) {}
