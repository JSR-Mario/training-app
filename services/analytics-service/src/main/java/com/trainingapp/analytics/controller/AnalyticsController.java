package com.trainingapp.analytics.controller;

import com.trainingapp.analytics.config.UserContext;
import com.trainingapp.analytics.dto.ExerciseProgressResponse;
import com.trainingapp.analytics.dto.WeeklyVolumeResponse;
import com.trainingapp.analytics.repository.ExerciseProgressRepository;
import com.trainingapp.analytics.repository.WeeklyVolumeRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {

    private final WeeklyVolumeRepository volumeRepository;
    private final ExerciseProgressRepository progressRepository;

    public AnalyticsController(WeeklyVolumeRepository volumeRepository,
                               ExerciseProgressRepository progressRepository) {
        this.volumeRepository = volumeRepository;
        this.progressRepository = progressRepository;
    }

    @GetMapping("/volume")
    public List<WeeklyVolumeResponse> getWeeklyVolume(
            @RequestParam UUID programId,
            @RequestParam int weekNumber) {
        
        UUID userId = UserContext.getCurrentUserId();
        
        return volumeRepository.findByUserIdAndProgramIdAndWeekNumber(userId, programId, weekNumber)
                .stream()
                .map(v -> new WeeklyVolumeResponse(v.getBodyPart(), v.getTotalSets()))
                .collect(Collectors.toList());
    }

    @GetMapping("/progress/{exerciseId}")
    public List<ExerciseProgressResponse> getExerciseProgress(@PathVariable UUID exerciseId) {
        
        UUID userId = UserContext.getCurrentUserId();
        
        return progressRepository.findByUserIdAndExerciseIdOrderBySessionDateAsc(userId, exerciseId)
                .stream()
                .map(p -> new ExerciseProgressResponse(
                        p.getSessionDate(),
                        p.getMaxWeightKg(),
                        p.getTotalVolumeKg(),
                        p.getTotalSets()
                ))
                .collect(Collectors.toList());
    }
}
