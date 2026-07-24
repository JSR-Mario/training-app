package com.trainingapp.analytics.service;

import com.trainingapp.analytics.domain.ExerciseProgressEntry;
import com.trainingapp.analytics.domain.WeeklyVolumeSnapshot;
import com.trainingapp.analytics.dto.SessionCompletedEvent;
import com.trainingapp.analytics.dto.SessionUncompletedEvent;
import com.trainingapp.analytics.repository.ExerciseProgressRepository;
import com.trainingapp.analytics.repository.WeeklyVolumeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MetricsCalculationServiceTest {

    @Mock
    private WeeklyVolumeRepository volumeRepository;

    @Mock
    private ExerciseProgressRepository progressRepository;

    @Mock
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    @InjectMocks
    private MetricsCalculationService metricsCalculationService;

    private UUID userId;
    private UUID programId;
    private UUID exerciseId;
    private UUID sessionId;
    private LocalDate sessionDate;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        programId = UUID.randomUUID();
        exerciseId = UUID.randomUUID();
        sessionId = UUID.randomUUID();
        sessionDate = LocalDate.now();
    }

    // ── processSessionCompleted ──────────────────────────────────────────────

    @Test
    void processSessionCompleted_CalculatesMetricsCorrectly() {
        // Arrange
        UUID dayTemplateId = UUID.randomUUID();
        SessionCompletedEvent.SetData set1 = new SessionCompletedEvent.SetData(
            exerciseId, 10, null, new BigDecimal("50.00"),
            Map.of("MID_CHEST", new BigDecimal("1.0"), "TRICEPS", new BigDecimal("0.5"))
        );
        SessionCompletedEvent.SetData set2 = new SessionCompletedEvent.SetData(
            exerciseId, 8, null, new BigDecimal("55.00"),
            Map.of("MID_CHEST", new BigDecimal("1.0"), "TRICEPS", new BigDecimal("0.5"))
        );

        SessionCompletedEvent event = new SessionCompletedEvent(
            sessionId, userId, programId, 1, dayTemplateId, sessionDate, List.of(set1, set2)
        );

        when(progressRepository.findByUserIdAndExerciseIdAndSessionId(userId, exerciseId, sessionId))
            .thenReturn(Optional.empty());
        when(volumeRepository.findByUserIdAndProgramIdAndWeekNumberAndBodyPart(userId, programId, 1, "MID_CHEST"))
            .thenReturn(Optional.empty());
        when(volumeRepository.findByUserIdAndProgramIdAndWeekNumberAndBodyPart(userId, programId, 1, "TRICEPS"))
            .thenReturn(Optional.empty());

        // Act
        metricsCalculationService.processSessionCompleted(event);

        // Assert — exercise progress
        ArgumentCaptor<ExerciseProgressEntry> progressCaptor = ArgumentCaptor.forClass(ExerciseProgressEntry.class);
        verify(progressRepository).save(progressCaptor.capture());
        ExerciseProgressEntry progress = progressCaptor.getValue();

        assertThat(progress.getMaxWeightKg()).isEqualByComparingTo("55.00");
        // (10 * 50) + (8 * 55) = 500 + 440 = 940
        assertThat(progress.getTotalVolumeKg()).isEqualByComparingTo("940.00");
        assertThat(progress.getTotalSets()).isEqualTo(2);
        assertThat(progress.getWeekNumber()).isEqualTo(1);
        assertThat(progress.getDayTemplateId()).isEqualTo(dayTemplateId);
        assertThat(progress.getSessionId()).isEqualTo(sessionId);

        // Assert — weekly volume
        ArgumentCaptor<WeeklyVolumeSnapshot> volumeCaptor = ArgumentCaptor.forClass(WeeklyVolumeSnapshot.class);
        verify(volumeRepository, times(2)).save(volumeCaptor.capture());

        List<WeeklyVolumeSnapshot> volumes = volumeCaptor.getAllValues();
        assertThat(volumes).hasSize(2);

        WeeklyVolumeSnapshot chestVol = volumes.stream()
            .filter(v -> v.getBodyPart().equals("MID_CHEST")).findFirst().orElseThrow();
        assertThat(chestVol.getTotalSets()).isEqualByComparingTo("2.0"); // 2 sets * 1.0

        WeeklyVolumeSnapshot tricepsVol = volumes.stream()
            .filter(v -> v.getBodyPart().equals("TRICEPS")).findFirst().orElseThrow();
        assertThat(tricepsVol.getTotalSets()).isEqualByComparingTo("1.0"); // 2 sets * 0.5
    }

    /**
     * Verifies Bug 1 is fixed: two different sessions containing the same exercise
     * on the same calendar date produce separate ExerciseProgressEntry rows instead
     * of the second one overwriting the first.
     */
    @Test
    void processSessionCompleted_SameExerciseSameDate_DifferentSessions_CreatesSeperateEntries() {
        UUID sessionIdA = UUID.randomUUID();
        UUID sessionIdB = UUID.randomUUID();
        UUID dayTemplateIdA = UUID.randomUUID();
        UUID dayTemplateIdB = UUID.randomUUID();

        SessionCompletedEvent eventA = new SessionCompletedEvent(
            sessionIdA, userId, programId, 2, dayTemplateIdA, sessionDate,
            List.of(new SessionCompletedEvent.SetData(
                exerciseId, 10, null, new BigDecimal("100.00"), Map.of("LATS", new BigDecimal("1.0"))))
        );
        SessionCompletedEvent eventB = new SessionCompletedEvent(
            sessionIdB, userId, programId, 2, dayTemplateIdB, sessionDate, // same date
            List.of(new SessionCompletedEvent.SetData(
                exerciseId, 5, null, new BigDecimal("60.00"), Map.of("LATS", new BigDecimal("1.0"))))
        );

        // Session A has no existing entry, session B also has no existing entry
        when(progressRepository.findByUserIdAndExerciseIdAndSessionId(userId, exerciseId, sessionIdA))
            .thenReturn(Optional.empty());
        when(progressRepository.findByUserIdAndExerciseIdAndSessionId(userId, exerciseId, sessionIdB))
            .thenReturn(Optional.empty());
        when(volumeRepository.findByUserIdAndProgramIdAndWeekNumberAndBodyPart(any(), any(), anyInt(), any()))
            .thenReturn(Optional.empty());

        metricsCalculationService.processSessionCompleted(eventA);
        metricsCalculationService.processSessionCompleted(eventB);

        // Two separate saves for two separate entries (not one overwriting the other)
        verify(progressRepository, times(2)).save(any(ExerciseProgressEntry.class));

        // Verify each lookup used a distinct sessionId
        verify(progressRepository).findByUserIdAndExerciseIdAndSessionId(userId, exerciseId, sessionIdA);
        verify(progressRepository).findByUserIdAndExerciseIdAndSessionId(userId, exerciseId, sessionIdB);
    }

    /**
     * Verifies that re-completing the same session overwrites values correctly
     * (idempotent behaviour).
     */
    @Test
    void processSessionCompleted_ReComplete_OverwritesExistingEntry() {
        UUID dayTemplateId = UUID.randomUUID();
        SessionCompletedEvent event = new SessionCompletedEvent(
            sessionId, userId, programId, 1, dayTemplateId, sessionDate,
            List.of(new SessionCompletedEvent.SetData(
                exerciseId, 12, null, new BigDecimal("80.00"), Map.of("LATS", new BigDecimal("1.0"))))
        );

        // Simulate pre-existing entry from a previous complete
        ExerciseProgressEntry existing = new ExerciseProgressEntry();
        existing.setId(UUID.randomUUID());
        existing.setUserId(userId);
        existing.setExerciseId(exerciseId);
        existing.setSessionId(sessionId);
        existing.setSessionDate(sessionDate);
        existing.setWeekNumber(1);
        existing.setDayTemplateId(dayTemplateId);
        existing.setMaxWeightKg(new BigDecimal("70.00")); // old values
        existing.setTotalVolumeKg(new BigDecimal("700.00"));
        existing.setTotalSets(10);

        when(progressRepository.findByUserIdAndExerciseIdAndSessionId(userId, exerciseId, sessionId))
            .thenReturn(Optional.of(existing));
        when(volumeRepository.findByUserIdAndProgramIdAndWeekNumberAndBodyPart(any(), any(), anyInt(), any()))
            .thenReturn(Optional.empty());

        metricsCalculationService.processSessionCompleted(event);

        ArgumentCaptor<ExerciseProgressEntry> captor = ArgumentCaptor.forClass(ExerciseProgressEntry.class);
        verify(progressRepository).save(captor.capture());

        ExerciseProgressEntry saved = captor.getValue();
        // Values should be replaced with the new session data
        assertThat(saved.getMaxWeightKg()).isEqualByComparingTo("80.00");
        assertThat(saved.getTotalVolumeKg()).isEqualByComparingTo("960.00"); // 12 * 80
        assertThat(saved.getTotalSets()).isEqualTo(1);
    }

    // ── processSessionUncompleted ────────────────────────────────────────────

    /**
     * Verifies Bug 2 is fixed: uncomplete deletes ALL entries for the session
     * in a single bulk call rather than per-exercise date-based lookups.
     */
    @Test
    void processSessionUncompleted_DeletesBySessionId_NotByDate() {
        UUID dayTemplateId = UUID.randomUUID();
        SessionUncompletedEvent event = new SessionUncompletedEvent(
            sessionId, userId, programId, 1, dayTemplateId, sessionDate,
            List.of(
                new SessionUncompletedEvent.SetData(
                    exerciseId, 10, null, new BigDecimal("50.00"),
                    Map.of("MID_CHEST", new BigDecimal("1.0"), "TRICEPS", new BigDecimal("0.5")))
            )
        );

        WeeklyVolumeSnapshot chestSnapshot = new WeeklyVolumeSnapshot();
        chestSnapshot.setId(UUID.randomUUID());
        chestSnapshot.setTotalSets(new BigDecimal("5.0"));
        chestSnapshot.setBodyPart("MID_CHEST");

        WeeklyVolumeSnapshot tricepsSnapshot = new WeeklyVolumeSnapshot();
        tricepsSnapshot.setId(UUID.randomUUID());
        tricepsSnapshot.setTotalSets(new BigDecimal("3.0"));
        tricepsSnapshot.setBodyPart("TRICEPS");

        when(volumeRepository.findByUserIdAndProgramIdAndWeekNumberAndBodyPart(userId, programId, 1, "MID_CHEST"))
            .thenReturn(Optional.of(chestSnapshot));
        when(volumeRepository.findByUserIdAndProgramIdAndWeekNumberAndBodyPart(userId, programId, 1, "TRICEPS"))
            .thenReturn(Optional.of(tricepsSnapshot));

        metricsCalculationService.processSessionUncompleted(event);

        // Bulk delete must be called exactly once with the sessionId
        verify(progressRepository).deleteByUserIdAndSessionId(userId, sessionId);

        // Volume snapshots should be reduced
        assertThat(chestSnapshot.getTotalSets()).isEqualByComparingTo("4.0"); // 5.0 - 1.0 (1 set * 1.0)
        assertThat(tricepsSnapshot.getTotalSets()).isEqualByComparingTo("2.5"); // 3.0 - 0.5 (1 set * 0.5)
    }

    @Test
    void processSessionUncompleted_VolumeDoesNotGoBelowZero() {
        UUID dayTemplateId = UUID.randomUUID();
        SessionUncompletedEvent event = new SessionUncompletedEvent(
            sessionId, userId, programId, 1, dayTemplateId, sessionDate,
            List.of(new SessionUncompletedEvent.SetData(
                exerciseId, 10, null, new BigDecimal("50.00"),
                Map.of("LATS", new BigDecimal("1.0"))))
        );

        WeeklyVolumeSnapshot snapshot = new WeeklyVolumeSnapshot();
        snapshot.setId(UUID.randomUUID());
        snapshot.setTotalSets(new BigDecimal("0.5")); // less than what we'll subtract
        snapshot.setBodyPart("LATS");

        when(volumeRepository.findByUserIdAndProgramIdAndWeekNumberAndBodyPart(userId, programId, 1, "LATS"))
            .thenReturn(Optional.of(snapshot));

        metricsCalculationService.processSessionUncompleted(event);

        // Should clamp at zero, not go negative
        assertThat(snapshot.getTotalSets()).isEqualByComparingTo("0.0");
    }
}
