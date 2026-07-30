package com.trainingapp.training.dto;

import com.trainingapp.training.domain.HabitFrequency;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class HabitResponse {
    private UUID id;
    private String title;
    private String description;
    private HabitFrequency frequency;
    private int currentStreak;
    private int longestStreak;
    private List<LocalDate> completedDates;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public HabitFrequency getFrequency() { return frequency; }
    public void setFrequency(HabitFrequency frequency) { this.frequency = frequency; }
    
    public int getCurrentStreak() { return currentStreak; }
    public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }
    
    public int getLongestStreak() { return longestStreak; }
    public void setLongestStreak(int longestStreak) { this.longestStreak = longestStreak; }
    
    public List<LocalDate> getCompletedDates() { return completedDates; }
    public void setCompletedDates(List<LocalDate> completedDates) { this.completedDates = completedDates; }
}
