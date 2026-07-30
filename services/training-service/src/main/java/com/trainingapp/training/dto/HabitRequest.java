package com.trainingapp.training.dto;

import com.trainingapp.training.domain.HabitFrequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class HabitRequest {
    @NotBlank
    private String title;
    
    private String description;
    
    @NotNull
    private HabitFrequency frequency;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public HabitFrequency getFrequency() { return frequency; }
    public void setFrequency(HabitFrequency frequency) { this.frequency = frequency; }
}
