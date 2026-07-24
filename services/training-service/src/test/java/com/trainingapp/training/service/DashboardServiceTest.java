package com.trainingapp.training.service;

import com.trainingapp.training.domain.UserExperience;
import com.trainingapp.training.dto.DashboardSummaryResponse;
import com.trainingapp.training.repository.BodyWeightRepository;
import com.trainingapp.training.repository.CardioLogRepository;
import com.trainingapp.training.repository.TrainingProgramRepository;
import com.trainingapp.training.repository.WorkoutSessionRepository;
import com.trainingapp.training.repository.WorkoutSetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private CardioLogRepository cardioLogRepository;

    @Mock
    private WorkoutSessionRepository sessionRepository;

    @Mock
    private WorkoutSetRepository setRepository;

    @Mock
    private BodyWeightRepository bodyWeightRepository;

    @Mock
    private ExperienceService experienceService;

    @Mock
    private TrainingProgramRepository programRepository;

    @InjectMocks
    private DashboardService dashboardService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();

        UserExperience ux = new UserExperience(userId, BigDecimal.valueOf(100));

        when(cardioLogRepository.findByUserIdAndPerformedOnBetween(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(sessionRepository.findByUserIdAndPerformedOnBetween(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(setRepository.findByUserIdAndPerformedOnBetween(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(bodyWeightRepository.findAllByUserIdAndDateBetweenOrderByDateAsc(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(programRepository.findByUserIdAndIsActiveTrue(userId))
                .thenReturn(Optional.empty());
        when(experienceService.getOrInitialize(userId)).thenReturn(ux);
        when(experienceService.calculateLevel(100.0)).thenReturn(2);
        when(experienceService.currentLevelXp(100.0)).thenReturn(0.0);
        when(experienceService.nextLevelXp(100.0)).thenReturn(100.0);
    }

    @Test
    void getSummary_withNullTimezone_defaultsToUtc() {
        DashboardSummaryResponse response = dashboardService.getSummary(userId, null);
        assertNotNull(response);
        assertNotNull(response.getActivityCalendar());
    }

    @Test
    void getSummary_withValidTimezone_calculatesUsingUserTimezone() {
        DashboardSummaryResponse response = dashboardService.getSummary(userId, "America/Mexico_City");
        assertNotNull(response);
        assertNotNull(response.getActivityCalendar());
    }

    @Test
    void getSummary_withInvalidTimezone_fallsBackToUtc() {
        DashboardSummaryResponse response = dashboardService.getSummary(userId, "Invalid/Timezone");
        assertNotNull(response);
        assertNotNull(response.getActivityCalendar());
    }
}
