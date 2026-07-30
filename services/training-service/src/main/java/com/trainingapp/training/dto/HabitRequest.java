package com.trainingapp.training.dto;

import com.trainingapp.training.domain.HabitFrequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HabitRequest {
    @NotBlank
    private String title;
    private String description;
    @NotNull
    private HabitFrequency frequency;
}
