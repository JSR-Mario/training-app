package com.trainingapp.analytics.controller;

import com.trainingapp.analytics.config.UserContext;
import com.trainingapp.analytics.dto.DayVolumeResponse;
import com.trainingapp.analytics.dto.ExerciseProgressResponse;
import com.trainingapp.analytics.dto.WeeklyVolumeResponse;
import com.trainingapp.analytics.repository.ExerciseProgressRepository;
import com.trainingapp.analytics.repository.WeeklyVolumeRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Read-only analytics endpoints consumed by the frontend charts.
 *
 * <p>All endpoints are scoped to the authenticated user via {@link UserContext}.
 * No write operations are performed here; data is produced by
 * {@link com.trainingapp.analytics.service.MetricsCalculationService}.
 */
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

    /**
     * Returns the weekly volume breakdown by body part for a given program week.
     *
     * @param programId  the program UUID
     * @param weekNumber the week number within the program
     * @return list of body-part volume snapshots
     */
    @GetMapping("/volume")
    @org.springframework.cache.annotation.Cacheable(value = "weeklyVolume:v1", key = "T(com.trainingapp.analytics.config.UserContext).getCurrentUserId().toString() + ':' + #programId + ':' + #weekNumber")
    public List<WeeklyVolumeResponse> getWeeklyVolume(
            @RequestParam UUID programId,
            @RequestParam int weekNumber) {

        UUID userId = UserContext.getCurrentUserId();

        return volumeRepository.findByUserIdAndProgramIdAndWeekNumber(userId, programId, weekNumber)
                .stream()
                .map(v -> new WeeklyVolumeResponse(v.getBodyPart(), v.getTotalSets()))
                .collect(Collectors.toList());
    }

    /**
     * Returns the chronological progress entries for a specific exercise.
     * Used to build per-exercise strength progression charts.
     *
     * @param exerciseId the exercise UUID
     * @return list of progress snapshots ordered by session date ascending
     */
    @GetMapping("/progress/{exerciseId}")
    @org.springframework.cache.annotation.Cacheable(value = "exerciseProgress:v1", key = "T(com.trainingapp.analytics.config.UserContext).getCurrentUserId().toString() + ':' + #exerciseId")
    public List<ExerciseProgressResponse> getExerciseProgress(@PathVariable UUID exerciseId) {

        UUID userId = UserContext.getCurrentUserId();

        return progressRepository.findByUserIdAndExerciseIdOrderBySessionDateAsc(userId, exerciseId)
                .stream()
                .map(p -> new ExerciseProgressResponse(
                        p.getSessionDate(),
                        p.getWeekNumber(),
                        p.getDayTemplateId(),
                        p.getMaxWeightKg(),
                        p.getTotalVolumeKg(),
                        p.getTotalSets()
                ))
                .collect(Collectors.toList());
    }

    /**
     * Returns the aggregated total volume per completed session for a given workout day.
     *
     * <p>Sums {@code total_volume_kg} across all exercises in each session, grouped by
     * {@code (session_date, session_id, week_number)}. Because the aggregation is based
     * on stored {@code exercise_progress} rows (not the current exercise list), historical
     * bars remain accurate even when exercises are added or removed from the day template.
     *
     * <p>The client uses {@code sessionId} to highlight the current session bar.
     *
     * @param dayTemplateId the day template UUID whose session history is requested
     * @return list of aggregated day-volume entries ordered by session date ascending
     */
    @GetMapping("/day-volume")
    @org.springframework.cache.annotation.Cacheable(value = "dayVolume:v1", key = "T(com.trainingapp.analytics.config.UserContext).getCurrentUserId().toString() + ':' + #dayTemplateId")
    public List<DayVolumeResponse> getDayVolume(@RequestParam UUID dayTemplateId) {

        UUID userId = UserContext.getCurrentUserId();

        return progressRepository.findDayVolumeByUserIdAndDayTemplateId(userId, dayTemplateId)
                .stream()
                .map(row -> new DayVolumeResponse(
                        (LocalDate)  row[0],
                        (UUID)       row[1],
                        (Integer)    row[2],
                        (BigDecimal) row[3]))
                .collect(Collectors.toList());
    }
}
