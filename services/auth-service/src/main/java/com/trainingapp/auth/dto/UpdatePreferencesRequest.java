package com.trainingapp.auth.dto;

import jakarta.validation.constraints.Size;

public record UpdatePreferencesRequest(
        @Size(max = 20)
        String themeMode,

        @Size(max = 50)
        String themePos,

        @Size(max = 50)
        String themeNeg
) {}
