package com.trainingapp.training.dto;

import com.trainingapp.training.domain.HabitFrequency;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class HabitResponse {
    private UUID id;
    private String title;
    private String description;
    private HabitFrequency frequency;
    private int currentStreak;
    private int longestStreak;
    private List<LocalDate> completedDates;
}
