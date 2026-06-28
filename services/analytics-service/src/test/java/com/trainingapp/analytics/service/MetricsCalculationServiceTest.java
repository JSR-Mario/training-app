package com.trainingapp.analytics.service;

import com.trainingapp.analytics.domain.ExerciseProgressEntry;
import com.trainingapp.analytics.domain.WeeklyVolumeSnapshot;
import com.trainingapp.analytics.dto.SessionCompletedEvent;
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

    @InjectMocks
    private MetricsCalculationService metricsCalculationService;

    private UUID userId;
    private UUID programId;
    private UUID exerciseId;
    private LocalDate sessionDate;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        programId = UUID.randomUUID();
        exerciseId = UUID.randomUUID();
        sessionDate = LocalDate.now();
    }

    @Test
    void processSessionCompleted_CalculatesMetricsCorrectly() {
        // Arrange
        SessionCompletedEvent.SetData set1 = new SessionCompletedEvent.SetData(
            exerciseId, 10, null, new BigDecimal("50.00"), 
            Map.of("MID_CHEST", new BigDecimal("1.0"), "TRICEPS", new BigDecimal("0.5"))
        );
        SessionCompletedEvent.SetData set2 = new SessionCompletedEvent.SetData(
            exerciseId, 8, null, new BigDecimal("55.00"), 
            Map.of("MID_CHEST", new BigDecimal("1.0"), "TRICEPS", new BigDecimal("0.5"))
        );

        SessionCompletedEvent event = new SessionCompletedEvent(
            UUID.randomUUID(), userId, programId, 1, sessionDate, List.of(set1, set2)
        );

        when(progressRepository.findByUserIdAndExerciseIdAndSessionDate(userId, exerciseId, sessionDate))
            .thenReturn(Optional.empty());

        when(volumeRepository.findByUserIdAndProgramIdAndWeekNumberAndBodyPart(userId, programId, 1, "MID_CHEST"))
            .thenReturn(Optional.empty());
        when(volumeRepository.findByUserIdAndProgramIdAndWeekNumberAndBodyPart(userId, programId, 1, "TRICEPS"))
            .thenReturn(Optional.empty());

        // Act
        metricsCalculationService.processSessionCompleted(event);

        // Assert Progress
        ArgumentCaptor<ExerciseProgressEntry> progressCaptor = ArgumentCaptor.forClass(ExerciseProgressEntry.class);
        verify(progressRepository).save(progressCaptor.capture());
        ExerciseProgressEntry progress = progressCaptor.getValue();
        
        assertThat(progress.getMaxWeightKg()).isEqualByComparingTo("55.00");
        // (10 * 50) + (8 * 55) = 500 + 440 = 940
        assertThat(progress.getTotalVolumeKg()).isEqualByComparingTo("940.00");
        assertThat(progress.getTotalSets()).isEqualTo(2);

        // Assert Volume
        ArgumentCaptor<WeeklyVolumeSnapshot> volumeCaptor = ArgumentCaptor.forClass(WeeklyVolumeSnapshot.class);
        verify(volumeRepository, times(2)).save(volumeCaptor.capture());
        
        List<WeeklyVolumeSnapshot> volumes = volumeCaptor.getAllValues();
        assertThat(volumes).hasSize(2);
        
        WeeklyVolumeSnapshot chestVol = volumes.stream().filter(v -> v.getBodyPart().equals("MID_CHEST")).findFirst().get();
        // 2 sets * 1.0
        assertThat(chestVol.getTotalSets()).isEqualByComparingTo("2.0");

        WeeklyVolumeSnapshot tricepsVol = volumes.stream().filter(v -> v.getBodyPart().equals("TRICEPS")).findFirst().get();
        // 2 sets * 0.5
        assertThat(tricepsVol.getTotalSets()).isEqualByComparingTo("1.0");
    }
}
