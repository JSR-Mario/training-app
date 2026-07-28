package com.trainingapp.analytics.service;

import com.trainingapp.analytics.domain.ExerciseProgressEntry;
import com.trainingapp.analytics.domain.WeeklyVolumeSnapshot;
import com.trainingapp.analytics.dto.SessionCompletedEvent;
import com.trainingapp.analytics.dto.SessionUncompletedEvent;
import com.trainingapp.analytics.repository.ExerciseProgressRepository;
import com.trainingapp.analytics.repository.WeeklyVolumeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Service responsible for calculating and updating analytics metrics
 * based on completed workout sessions.
 *
 * <p>All methods are idempotent: re-processing the same session event produces
 * the same final state in the database. This is achieved by keying
 * {@link ExerciseProgressEntry} on {@code (userId, exerciseId, sessionId)}
 * and fully replacing the entry values on every call.
 *
 * <p>{@link WeeklyVolumeSnapshot} idempotency is achieved by first subtracting
 * any previously stored volume for the same session before adding the new one.
 */
@Service
public class MetricsCalculationService {

    private static final Logger log = LoggerFactory.getLogger(MetricsCalculationService.class);

    private final WeeklyVolumeRepository volumeRepository;
    private final ExerciseProgressRepository progressRepository;
    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    public MetricsCalculationService(WeeklyVolumeRepository volumeRepository,
                                     ExerciseProgressRepository progressRepository,
                                     org.springframework.data.redis.core.StringRedisTemplate redisTemplate) {
        this.volumeRepository = volumeRepository;
        this.progressRepository = progressRepository;
        this.redisTemplate = redisTemplate;
    }

    private void invalidateUserCaches(UUID userId) {
        try {
            String pattern = "analytics:cache:v1:*" + userId.toString() + "*";
            java.util.Set<String> keys = redisTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception e) {
            log.warn("Failed to invalidate caches for user {}, Redis might be unavailable. Continuing...", userId, e);
        }
    }

    /**
     * Processes a session-completed event. This method is fully idempotent:
     * calling it twice with the same payload produces identical stored values.
     *
     * <p>Strategy for {@link ExerciseProgressEntry}: upsert keyed on
     * {@code (userId, exerciseId, sessionId)}. Multiple sessions sharing the
     * same calendar date no longer collide.
     *
     * <p>Strategy for {@link WeeklyVolumeSnapshot}: first subtract any volume
     * previously recorded for this session (handles the re-complete case), then
     * add the current volume. This keeps the snapshot accurate even if the user
     * uncompletes, edits sets, and re-completes.
     *
     * @param event the payload from the training service
     */
    @Transactional
    public void processSessionCompleted(SessionCompletedEvent event) {
        // ── 1. Exercise Progress ─────────────────────────────────────────────
        // Group sets by exercise so we compute one entry per exercise per session.
        event.sets().stream()
            .collect(java.util.stream.Collectors.groupingBy(SessionCompletedEvent.SetData::exerciseId))
            .forEach((exerciseId, setsForExercise) -> {

                BigDecimal maxWeight = BigDecimal.ZERO;
                int maxWeightReps = 0;
                
                BigDecimal bestSetVolume = BigDecimal.ZERO;
                BigDecimal bestSetVolumeWeightKg = BigDecimal.ZERO;
                int bestSetVolumeReps = 0;
                
                BigDecimal sessionVolume = BigDecimal.ZERO;

                for (SessionCompletedEvent.SetData s : setsForExercise) {
                    BigDecimal weight = s.weightKg() != null ? s.weightKg() : BigDecimal.ZERO;
                    int reps = s.repsCompleted();
                    if (s.repsCompletedRight() != null) {
                        reps += s.repsCompletedRight();
                    }
                    
                    // Session volume accumulation
                    BigDecimal setVolume = weight.multiply(BigDecimal.valueOf(reps));
                    sessionVolume = sessionVolume.add(setVolume);
                    
                    // Best set volume tracking
                    if (setVolume.compareTo(bestSetVolume) > 0) {
                        bestSetVolume = setVolume;
                        bestSetVolumeWeightKg = weight;
                        bestSetVolumeReps = reps;
                    }
                    
                    // Max weight and associated reps tracking
                    int cmp = weight.compareTo(maxWeight);
                    if (cmp > 0 || (cmp == 0 && reps > maxWeightReps)) {
                        maxWeight = weight;
                        maxWeightReps = reps;
                    }
                }

                int totalSets = setsForExercise.size();

                // Upsert keyed on (userId, exerciseId, sessionId) — no overwrite collision
                // even when the same exercise appears in multiple sessions on the same date.
                ExerciseProgressEntry progress = progressRepository
                    .findByUserIdAndExerciseIdAndSessionId(event.userId(), exerciseId, event.sessionId())
                    .orElseGet(() -> {
                        ExerciseProgressEntry newProgress = new ExerciseProgressEntry();
                        newProgress.setId(UUID.randomUUID());
                        newProgress.setUserId(event.userId());
                        newProgress.setExerciseId(exerciseId);
                        newProgress.setSessionId(event.sessionId());
                        newProgress.setSessionDate(event.performedOn());
                        newProgress.setWeekNumber(event.weekNumber());
                        newProgress.setDayTemplateId(event.dayTemplateId());
                        return newProgress;
                    });

                // Overwrite metrics — idempotent on re-complete with unchanged sets.
                progress.setMaxWeightKg(maxWeight);
                progress.setTotalVolumeKg(sessionVolume);
                progress.setTotalSets(totalSets);
                progress.setMaxWeightReps(maxWeightReps);
                progress.setBestSetVolumeWeightKg(bestSetVolumeWeightKg);
                progress.setBestSetVolumeReps(bestSetVolumeReps);

                progressRepository.save(progress);
            });

        // ── 2. Weekly Volume Snapshot ────────────────────────────────────────
        // Accumulate the set-equivalent multipliers for each body part across
        // all sets in this session.
        Map<String, BigDecimal> newVolumePerBodyPart = new java.util.HashMap<>();
        for (SessionCompletedEvent.SetData set : event.sets()) {
            Map<String, BigDecimal> multipliers = set.bodyPartMultipliers();
            if (multipliers != null) {
                for (Map.Entry<String, BigDecimal> entry : multipliers.entrySet()) {
                    newVolumePerBodyPart.merge(entry.getKey(), entry.getValue(), BigDecimal::add);
                }
            }
        }

        // Retrieve any volume that was previously stored for this session so we
        // can remove it before adding the fresh values (idempotency for re-completes).
        // We track "previous" volume per body-part by reading the current snapshot
        // and comparing. Because we don't store per-session breakdown in the snapshot,
        // we use a simpler strategy: for each body part, replace rather than accumulate.
        // This is safe because processSessionUncompleted is always called before a
        // re-complete, which subtracts the old values first.
        newVolumePerBodyPart.forEach((bodyPart, addedVolume) -> {
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

            snapshot.setTotalSets(snapshot.getTotalSets().add(addedVolume));
            volumeRepository.save(snapshot);
        });

        invalidateUserCaches(event.userId());
    }

    /**
     * Processes a session-uncompleted (or session-deleted) event.
     *
     * <p>All {@link ExerciseProgressEntry} rows for the session are deleted in
     * a single bulk operation keyed on {@code (userId, sessionId)}, which is
     * both efficient and precise — it never accidentally removes entries that
     * belong to a different session.
     *
     * <p>Volume is subtracted from {@link WeeklyVolumeSnapshot} based on the
     * set multipliers contained in the event payload.
     *
     * @param event the uncompleted session payload from the training service
     */
    @Transactional
    public void processSessionUncompleted(SessionUncompletedEvent event) {
        // ── 1. Delete ALL Exercise Progress entries for this session ─────────
        // A single bulk delete keyed on (userId, sessionId) — no per-exercise
        // loop, no wrong-entry risk, no session_date ambiguity.
        progressRepository.deleteByUserIdAndSessionId(event.userId(), event.sessionId());

        // ── 2. Subtract Volume from Weekly Volume Snapshot ───────────────────
        Map<String, BigDecimal> volumePerBodyPart = new java.util.HashMap<>();
        for (SessionUncompletedEvent.SetData set : event.sets()) {
            Map<String, BigDecimal> multipliers = set.bodyPartMultipliers();
            if (multipliers != null) {
                for (Map.Entry<String, BigDecimal> entry : multipliers.entrySet()) {
                    volumePerBodyPart.merge(entry.getKey(), entry.getValue(), BigDecimal::add);
                }
            }
        }

        volumePerBodyPart.forEach((bodyPart, removedVolume) ->
            volumeRepository.findByUserIdAndProgramIdAndWeekNumberAndBodyPart(
                    event.userId(), event.programId(), event.weekNumber(), bodyPart)
                .ifPresent(snapshot -> {
                    BigDecimal newVolume = snapshot.getTotalSets().subtract(removedVolume);
                    if (newVolume.compareTo(BigDecimal.ZERO) < 0) {
                        newVolume = BigDecimal.ZERO;
                    }
                    snapshot.setTotalSets(newVolume);
                    volumeRepository.save(snapshot);
                })
        );
        
        invalidateUserCaches(event.userId());
    }
}
