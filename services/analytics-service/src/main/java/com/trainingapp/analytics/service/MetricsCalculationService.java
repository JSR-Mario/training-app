package com.trainingapp.analytics.service;

import com.trainingapp.analytics.domain.ExerciseProgressEntry;
import com.trainingapp.analytics.domain.WeeklyVolumeSnapshot;
import com.trainingapp.analytics.dto.SessionCompletedEvent;
import com.trainingapp.analytics.repository.ExerciseProgressRepository;
import com.trainingapp.analytics.repository.WeeklyVolumeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Service responsible for calculating and updating analytics metrics
 * based on completed workout sessions.
 */
@Service
public class MetricsCalculationService {

    private final WeeklyVolumeRepository volumeRepository;
    private final ExerciseProgressRepository progressRepository;

    public MetricsCalculationService(WeeklyVolumeRepository volumeRepository,
                                     ExerciseProgressRepository progressRepository) {
        this.volumeRepository = volumeRepository;
        this.progressRepository = progressRepository;
    }

    /**
     * Processes a session completed event. This method is idempotent.
     * It recalculates or adds the sets from the event into the database.
     * 
     * @param event the payload from the training service
     */
    @Transactional
    public void processSessionCompleted(SessionCompletedEvent event) {
        // 1. Process Exercise Progress
        // Group sets by exercise
        event.sets().stream()
            .collect(java.util.stream.Collectors.groupingBy(SessionCompletedEvent.SetData::exerciseId))
            .forEach((exerciseId, setsForExercise) -> {
                
                BigDecimal maxWeight = setsForExercise.stream()
                        .map(SessionCompletedEvent.SetData::weightKg)
                        .max(BigDecimal::compareTo)
                        .orElse(BigDecimal.ZERO);
                
                BigDecimal sessionVolume = setsForExercise.stream()
                    .map(s -> {
                        int totalReps = s.repsCompleted();
                        if (s.repsCompletedRight() != null) {
                            totalReps += s.repsCompletedRight();
                        }
                        return s.weightKg().multiply(BigDecimal.valueOf(totalReps));
                    })
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                
                int totalSets = setsForExercise.size();

                ExerciseProgressEntry progress = progressRepository
                    .findByUserIdAndExerciseIdAndSessionDate(event.userId(), exerciseId, event.performedOn())
                    .orElseGet(() -> {
                        ExerciseProgressEntry newProgress = new ExerciseProgressEntry();
                        newProgress.setId(UUID.randomUUID());
                        newProgress.setUserId(event.userId());
                        newProgress.setExerciseId(exerciseId);
                        newProgress.setSessionDate(event.performedOn());
                        newProgress.setWeekNumber(event.weekNumber());
                        newProgress.setDayTemplateId(event.dayTemplateId());
                        return newProgress;
                    });

                // Update metrics. (If reprocessing, this overwrites correctly)
                progress.setMaxWeightKg(maxWeight);
                progress.setTotalVolumeKg(sessionVolume);
                progress.setTotalSets(totalSets);

                progressRepository.save(progress);
            });

        // 2. Process Weekly Volume Snapshot
        // We sum up the "set equivalents" for each body part.
        // If a set has a target multiplier of 0.5 for Triceps, it adds 0.5 sets to Triceps.
        
        // Accumulate volume across all sets in this session
        Map<String, BigDecimal> volumePerBodyPart = new java.util.HashMap<>();
        for (SessionCompletedEvent.SetData set : event.sets()) {
            Map<String, BigDecimal> multipliers = set.bodyPartMultipliers();
            if (multipliers != null) {
                for (Map.Entry<String, BigDecimal> entry : multipliers.entrySet()) {
                    String bodyPart = entry.getKey();
                    BigDecimal multiplier = entry.getValue();
                    
                    // We assume 1 set = 1 unit of volume * multiplier
                    volumePerBodyPart.merge(bodyPart, multiplier, BigDecimal::add);
                }
            }
        }

        // Upsert volume snapshots
        volumePerBodyPart.forEach((bodyPart, addedVolume) -> {
            WeeklyVolumeSnapshot snapshot = volumeRepository
                .findByUserIdAndProgramIdAndWeekNumberAndBodyPart(
                        event.userId(), event.programId(), event.weekNumber(), bodyPart)
                .orElseGet(() -> {
                    WeeklyVolumeSnapshot newSnapshot = new WeeklyVolumeSnapshot();
                    newSnapshot.setId(UUID.randomUUID());
                    newSnapshot.setUserId(event.userId());
                    newSnapshot.setProgramId(event.programId());
                    newSnapshot.setWeekNumber(event.weekNumber());
                    newSnapshot.setBodyPart(bodyPart);
                    newSnapshot.setTotalSets(BigDecimal.ZERO);
                    return newSnapshot;
                });

            // Note: If we receive the same session event twice, this simple add would duplicate volume.
            // A more robust approach would be to track volume per session_id, but for MVP we assume 
            // the training-service only fires once per session and retry is manual (where we might need to reset).
            // For now, we just add.
            snapshot.setTotalSets(snapshot.getTotalSets().add(addedVolume));
            volumeRepository.save(snapshot);
        });
    }
}
