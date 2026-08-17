package com.trainingapp.training.service;

import com.trainingapp.training.client.AnalyticsNotificationClient;
import com.trainingapp.training.domain.DayTemplate;
import com.trainingapp.training.domain.TrainingProgram;
import com.trainingapp.training.domain.WeekTemplate;
import com.trainingapp.training.domain.WorkoutSession;
import com.trainingapp.training.domain.WorkoutSet;
import com.trainingapp.training.dto.WorkoutSessionRequest;
import com.trainingapp.training.dto.WorkoutSessionResponse;
import com.trainingapp.training.repository.DayTemplateRepository;
import com.trainingapp.training.repository.ExerciseBodyPartTargetRepository;
import com.trainingapp.training.repository.WorkoutSessionRepository;
import com.trainingapp.training.repository.WorkoutSetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkoutSessionServiceTest {

    @Mock private WorkoutSessionRepository sessionRepository;
    @Mock private DayTemplateRepository dayTemplateRepository;
    @Mock private WorkoutSetRepository setRepository;
    @Mock private ExerciseBodyPartTargetRepository targetRepository;
    @Mock private AnalyticsNotificationClient analyticsClient;
    @Mock private com.trainingapp.training.repository.SessionExerciseRatingRepository ratingRepository;
    @Mock private com.trainingapp.training.repository.DayExerciseRepository dayExerciseRepository;
    @Mock private com.trainingapp.training.repository.SessionExerciseRepository sessionExerciseRepository;
    @Mock private com.trainingapp.training.repository.ExerciseRepository exerciseRepository;
    @Mock private com.trainingapp.training.repository.BodyWeightRepository bodyWeightRepository;
    @Mock private ExperienceService experienceService;

    @InjectMocks private WorkoutSessionService sessionService;

    private UUID userId;
    private UUID dayTemplateId;
    private DayTemplate dayTemplate;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        dayTemplateId = UUID.randomUUID();

        TrainingProgram program = new TrainingProgram();
        program.setUserId(userId);
        ReflectionTestUtils.setField(program, "id", UUID.randomUUID());

        WeekTemplate week = new WeekTemplate();
        week.setProgram(program);

        dayTemplate = new DayTemplate();
        ReflectionTestUtils.setField(dayTemplate, "id", dayTemplateId);
        dayTemplate.setName("Push Day");
        dayTemplate.setWeekTemplate(week);
    }

    @Test
    void startSession_Success() {
        WorkoutSessionRequest request = new WorkoutSessionRequest(dayTemplateId, LocalDate.now(), 1);
        
        when(dayTemplateRepository.findById(dayTemplateId)).thenReturn(Optional.of(dayTemplate));
        
        WorkoutSession savedSession = new WorkoutSession();
        ReflectionTestUtils.setField(savedSession, "id", UUID.randomUUID());
        savedSession.setDayTemplate(dayTemplate);
        savedSession.setPerformedOn(request.performedOn());
        savedSession.setWeekNumber(1);
        
        when(sessionRepository.save(any(WorkoutSession.class))).thenReturn(savedSession);
        when(ratingRepository.findBySessionId(any())).thenReturn(Collections.emptyList());

        WorkoutSessionResponse response = sessionService.startSession(userId, request);

        assertThat(response).isNotNull();
        assertThat(response.dayTemplateName()).isEqualTo("Push Day");
        
        ArgumentCaptor<WorkoutSession> captor = ArgumentCaptor.forClass(WorkoutSession.class);
        verify(sessionRepository).save(captor.capture());
        assertThat(captor.getValue().getUserId()).isEqualTo(userId);
    }

    @Test
    void startSession_ThrowsForbidden_WhenNotTemplateOwner() {
        // Change program owner
        dayTemplate.getWeekTemplate().getProgram().setUserId(UUID.randomUUID());

        WorkoutSessionRequest request = new WorkoutSessionRequest(dayTemplateId, LocalDate.now(), 1);
        when(dayTemplateRepository.findById(dayTemplateId)).thenReturn(Optional.of(dayTemplate));

        assertThatThrownBy(() -> sessionService.startSession(userId, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Not your template");
    }

    @Test
    void completeSession_Success() {
        UUID sessionId = UUID.randomUUID();
        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setUserId(userId);
        session.setDayTemplate(dayTemplate);
        session.setPerformedOn(LocalDate.now());
        session.setWeekNumber(1);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId)).thenReturn(Collections.emptyList());
        when(targetRepository.findByExerciseIdIn(any())).thenReturn(List.of());
        doNothing().when(experienceService).addVolume(any(), anyDouble());

        sessionService.completeSession(sessionId, userId);

        assertThat(session.getCompletedAt()).isNotNull();
        verify(sessionRepository).save(session);
        verify(analyticsClient).notifySessionCompleted(any());
        verify(experienceService).addVolume(eq(userId), anyDouble());
    }

    @Test
    void completeSession_ThrowsBadRequest_IfAlreadyCompleted() {
        UUID sessionId = UUID.randomUUID();
        WorkoutSession session = new WorkoutSession();
        session.setCompletedAt(java.time.Instant.now());

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> sessionService.completeSession(sessionId, userId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already completed");
    }

    @Test
    void pauseSession_Success() {
        UUID sessionId = UUID.randomUUID();
        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setUserId(userId);
        session.setDayTemplate(dayTemplate);
        session.setStartedAt(java.time.Instant.now().minusSeconds(120));
        session.setLastResumedAt(java.time.Instant.now().minusSeconds(120));

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionRepository.save(any())).thenReturn(session);
        when(ratingRepository.findBySessionId(any())).thenReturn(Collections.emptyList());

        WorkoutSessionResponse response = sessionService.pauseSession(sessionId, userId);

        assertThat(response).isNotNull();
        assertThat(session.getPausedAt()).isNotNull();
        assertThat(session.getDurationSeconds()).isGreaterThanOrEqualTo(119);
        verify(sessionRepository).save(session);
    }

    @Test
    void resumeSession_Success() {
        UUID sessionId = UUID.randomUUID();
        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setUserId(userId);
        session.setDayTemplate(dayTemplate);
        session.setStartedAt(java.time.Instant.now().minusSeconds(300));
        session.setPausedAt(java.time.Instant.now().minusSeconds(60));
        session.setDurationSeconds(240);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionRepository.save(any())).thenReturn(session);
        when(ratingRepository.findBySessionId(any())).thenReturn(Collections.emptyList());

        WorkoutSessionResponse response = sessionService.resumeSession(sessionId, userId);

        assertThat(response).isNotNull();
        assertThat(session.getPausedAt()).isNull();
        assertThat(session.getLastResumedAt()).isNotNull();
        verify(sessionRepository).save(session);
    }

    @Test
    void getExerciseSuggestions_CalculatesFatigueCorrectly() {
        UUID sessionId = UUID.randomUUID();
        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setUserId(userId);
        session.setPerformedOn(LocalDate.now());

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());
        ex.setBodyweight(false);

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", UUID.randomUUID());
        se.setExercise(ex);
        se.setReps(10);
        se.setSession(session);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(se));

        when(setRepository.findPersonalRecordsByUserId(userId)).thenReturn(Collections.emptyList());
        when(bodyWeightRepository.findFirstByUserIdOrderByDateDesc(userId)).thenReturn(Optional.empty());

        // Setup historical sets (2 warnings = fatigue)
        WorkoutSession pastSession = new WorkoutSession();
        ReflectionTestUtils.setField(pastSession, "id", UUID.randomUUID());

        WorkoutSet set1 = new WorkoutSet();
        set1.setSession(pastSession);
        set1.setWeightKg(java.math.BigDecimal.valueOf(100));
        set1.setRepsCompleted(10); // Perf = 1000 (Max)

        WorkoutSet set2 = new WorkoutSet();
        set2.setSession(pastSession);
        set2.setWeightKg(java.math.BigDecimal.valueOf(100));
        set2.setRepsCompleted(8); // Perf = 800 (80% -> warning)

        WorkoutSet set3 = new WorkoutSet();
        set3.setSession(pastSession);
        set3.setWeightKg(java.math.BigDecimal.valueOf(100));
        set3.setRepsCompleted(8); // Perf = 800 (80% -> warning)

        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(List.of(set1, set2, set3));

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        assertThat(suggestions.get(0).hadFatigueLastWeek()).isTrue();
        assertThat(suggestions.get(0).previousSets()).hasSize(3);
    }

    @Test
    void getExerciseSuggestions_UsesHighestVolumePrAcrossOverlappingBuckets() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setPerformedOn(LocalDate.now());

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", UUID.randomUUID());
        se.setExercise(ex);
        // Target is 10-20 reps, meaning extended max is 25. Buckets 6-10, 11-15, 16-20, 21-25 are relevant.
        se.setReps(10);
        se.setRepsMax(20);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(se));

        // PR in bucket "11-15" at 17kg x 15 reps (Volume = 255)
        com.trainingapp.training.dto.ExercisePrProjection prLow = mock(com.trainingapp.training.dto.ExercisePrProjection.class);
        when(prLow.getExerciseId()).thenReturn(ex.getId());
        when(prLow.getBucket()).thenReturn("11-15");
        when(prLow.getPrWeight()).thenReturn(java.math.BigDecimal.valueOf(17));
        when(prLow.getPrReps()).thenReturn(15);

        // PR in bucket "21-25" at 15kg x 25 reps (Volume = 375)
        com.trainingapp.training.dto.ExercisePrProjection prHigh = mock(com.trainingapp.training.dto.ExercisePrProjection.class);
        when(prHigh.getExerciseId()).thenReturn(ex.getId());
        when(prHigh.getBucket()).thenReturn("21-25");
        when(prHigh.getPrWeight()).thenReturn(java.math.BigDecimal.valueOf(15));
        when(prHigh.getPrReps()).thenReturn(25);

        when(setRepository.findPersonalRecordsByUserId(userId)).thenReturn(List.of(prLow, prHigh));
        when(bodyWeightRepository.findFirstByUserIdOrderByDateDesc(userId)).thenReturn(Optional.empty());
        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(Collections.emptyList());

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        // Should pick the PR with highest volume (15kg * 25 = 375) across all overlapping buckets, even if it's not the heaviest weight
        assertThat(suggestions.get(0).suggestedWeightKg()).isEqualByComparingTo(java.math.BigDecimal.valueOf(15));
        // Suggested reps should still be the midpoint of the goal range
        assertThat(suggestions.get(0).suggestedReps()).isEqualTo(15);
    }

    @Test
    void getExerciseSuggestions_BilateralExerciseEvaluatesLimitingSideAndIncludesRepsRight() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setPerformedOn(LocalDate.now());

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());
        ex.setUnilateral(true);

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", UUID.randomUUID());
        se.setExercise(ex);
        se.setReps(10);
        se.setRepsMax(15);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(se));

        // 5 sets where only set 1 right side hit 15 reps (14/15, 14/14, 14/14, 14/14, 13/14)
        WorkoutSession prevSession = new WorkoutSession();
        ReflectionTestUtils.setField(prevSession, "id", UUID.randomUUID());

        com.trainingapp.training.domain.WorkoutSet set1 = new com.trainingapp.training.domain.WorkoutSet();
        set1.setSession(prevSession);
        set1.setSetNumber(1);
        set1.setWeightKg(java.math.BigDecimal.valueOf(21.6));
        set1.setRepsCompleted(14);
        set1.setRepsCompletedRight(15);

        com.trainingapp.training.domain.WorkoutSet set2 = new com.trainingapp.training.domain.WorkoutSet();
        set2.setSession(prevSession);
        set2.setSetNumber(2);
        set2.setWeightKg(java.math.BigDecimal.valueOf(21.6));
        set2.setRepsCompleted(14);
        set2.setRepsCompletedRight(14);

        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(List.of(set1, set2));

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        // Limiting side (14) didn't reach repsMax (15), so suggestAddWeight should be false
        assertThat(suggestions.get(0).suggestAddWeight()).isFalse();
        assertThat(suggestions.get(0).previousSets()).hasSize(2);
        assertThat(suggestions.get(0).previousSets().get(0).reps()).isEqualTo(14);
        assertThat(suggestions.get(0).previousSets().get(0).repsRight()).isEqualTo(15);
    }

    @Test
    void getExerciseSuggestions_SuggestsAddWeight_WhenAtLeastTwoSetsReachMaxReps() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setPerformedOn(LocalDate.now());

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());
        ex.setUnilateral(false);

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", UUID.randomUUID());
        se.setExercise(ex);
        se.setReps(12);
        se.setRepsMax(15);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(se));

        WorkoutSession prevSession = new WorkoutSession();
        ReflectionTestUtils.setField(prevSession, "id", UUID.randomUUID());

        // 4 sets total: Set 1 (99kg x 15), Set 2 (99kg x 15), Set 3 (99kg x 14), Set 4 (99kg x 14)
        com.trainingapp.training.domain.WorkoutSet set1 = new com.trainingapp.training.domain.WorkoutSet();
        set1.setSession(prevSession);
        set1.setSetNumber(1);
        set1.setWeightKg(java.math.BigDecimal.valueOf(99.0));
        set1.setRepsCompleted(15);

        com.trainingapp.training.domain.WorkoutSet set2 = new com.trainingapp.training.domain.WorkoutSet();
        set2.setSession(prevSession);
        set2.setSetNumber(2);
        set2.setWeightKg(java.math.BigDecimal.valueOf(99.0));
        set2.setRepsCompleted(15);

        com.trainingapp.training.domain.WorkoutSet set3 = new com.trainingapp.training.domain.WorkoutSet();
        set3.setSession(prevSession);
        set3.setSetNumber(3);
        set3.setWeightKg(java.math.BigDecimal.valueOf(99.0));
        set3.setRepsCompleted(14);

        com.trainingapp.training.domain.WorkoutSet set4 = new com.trainingapp.training.domain.WorkoutSet();
        set4.setSession(prevSession);
        set4.setSetNumber(4);
        set4.setWeightKg(java.math.BigDecimal.valueOf(99.0));
        set4.setRepsCompleted(14);

        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(List.of(set1, set2, set3, set4));

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        // 2 sets reached repsMax (15), so suggestAddWeight should be true
        assertThat(suggestions.get(0).suggestAddWeight()).isTrue();
    }

    @Test
    void getExerciseSuggestions_PrioritizesSameDayTemplate_OverCrossWorkoutSession() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID pushDayTemplateId = UUID.randomUUID();
        UUID pullDayTemplateId = UUID.randomUUID();

        com.trainingapp.training.domain.DayTemplate pushTemplate = new com.trainingapp.training.domain.DayTemplate();
        ReflectionTestUtils.setField(pushTemplate, "id", pushDayTemplateId);
        pushTemplate.setName("Push Day");

        com.trainingapp.training.domain.DayTemplate pullTemplate = new com.trainingapp.training.domain.DayTemplate();
        ReflectionTestUtils.setField(pullTemplate, "id", pullDayTemplateId);
        pullTemplate.setName("Pull Day");

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setDayTemplate(pushTemplate);
        session.setPerformedOn(LocalDate.now());

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());
        ex.setUnilateral(false);

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", UUID.randomUUID());
        se.setExercise(ex);
        se.setReps(6);
        se.setRepsMax(8);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(se));

        // More recent session from Pull Day (e.g. 2 days ago, 15 reps @ 60kg)
        WorkoutSession crossWorkoutSession = new WorkoutSession();
        ReflectionTestUtils.setField(crossWorkoutSession, "id", UUID.randomUUID());
        crossWorkoutSession.setDayTemplate(pullTemplate);
        crossWorkoutSession.setPerformedOn(LocalDate.now().minusDays(2));

        com.trainingapp.training.domain.WorkoutSet crossSet = new com.trainingapp.training.domain.WorkoutSet();
        crossSet.setSession(crossWorkoutSession);
        crossSet.setSetNumber(1);
        crossSet.setWeightKg(java.math.BigDecimal.valueOf(60.0));
        crossSet.setRepsCompleted(15);

        // Older session from same Push Day (e.g. 7 days ago, 8 reps @ 80kg)
        WorkoutSession sameDaySession = new WorkoutSession();
        ReflectionTestUtils.setField(sameDaySession, "id", UUID.randomUUID());
        sameDaySession.setDayTemplate(pushTemplate);
        sameDaySession.setPerformedOn(LocalDate.now().minusDays(7));

        com.trainingapp.training.domain.WorkoutSet pushSet = new com.trainingapp.training.domain.WorkoutSet();
        pushSet.setSession(sameDaySession);
        pushSet.setSetNumber(1);
        pushSet.setWeightKg(java.math.BigDecimal.valueOf(80.0));
        pushSet.setRepsCompleted(8);

        // allHistorical returns crossSet first (descending date) then pushSet
        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(List.of(crossSet, pushSet));

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        // Must pick the same day template sets (80kg x 8), avoiding cross-workout contamination
        assertThat(suggestions.get(0).previousSets()).hasSize(1);
        assertThat(suggestions.get(0).previousSets().get(0).weightKg()).isEqualByComparingTo(java.math.BigDecimal.valueOf(80.0));
        assertThat(suggestions.get(0).previousSets().get(0).reps()).isEqualTo(8);
    }

    @Test
    void getExerciseSuggestions_FiltersOutHistoricalSessionsOutsideRepRange() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setPerformedOn(LocalDate.now());

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());
        ex.setUnilateral(false);

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", UUID.randomUUID());
        se.setExercise(ex);
        se.setReps(15);
        se.setRepsMax(20);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(se));

        // Historical session only has 3-rep heavy sets (bucket 1-5, outside 15-20 rep range)
        WorkoutSession pastSession = new WorkoutSession();
        ReflectionTestUtils.setField(pastSession, "id", UUID.randomUUID());
        pastSession.setPerformedOn(LocalDate.now().minusDays(5));

        com.trainingapp.training.domain.WorkoutSet heavySet = new com.trainingapp.training.domain.WorkoutSet();
        heavySet.setSession(pastSession);
        heavySet.setSetNumber(1);
        heavySet.setWeightKg(java.math.BigDecimal.valueOf(120.0));
        heavySet.setRepsCompleted(3);

        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(List.of(heavySet));

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        // Incompatible 3-rep set must be omitted from previousSets
        assertThat(suggestions.get(0).previousSets()).isEmpty();
        // Should not trigger false fatigue or weight addition
        assertThat(suggestions.get(0).hadFatigueLastWeek()).isFalse();
        assertThat(suggestions.get(0).suggestAddWeight()).isFalse();
        // Suggested reps defaults to midpoint (17)
        assertThat(suggestions.get(0).suggestedReps()).isEqualTo(17);
    }

    @Test
    void startSession_WithPreviousNotesByDayName() {
        WorkoutSessionRequest request = new WorkoutSessionRequest(dayTemplateId, LocalDate.now(), 1);
        when(dayTemplateRepository.findById(dayTemplateId)).thenReturn(Optional.of(dayTemplate));

        UUID currentSessionId = UUID.randomUUID();
        WorkoutSession savedSession = new WorkoutSession();
        ReflectionTestUtils.setField(savedSession, "id", currentSessionId);
        savedSession.setDayTemplate(dayTemplate);
        savedSession.setUserId(userId);

        WorkoutSession previousSession = new WorkoutSession();
        ReflectionTestUtils.setField(previousSession, "id", UUID.randomUUID());
        previousSession.setNotes("Heavy bench press 100kg");

        when(sessionRepository.save(any(WorkoutSession.class))).thenReturn(savedSession);
        when(ratingRepository.findBySessionId(any())).thenReturn(Collections.emptyList());
        when(sessionRepository.findPreviousSessionsWithNotesByDayName(eq(userId), eq(currentSessionId), eq("Push Day"), any()))
                .thenReturn(List.of(previousSession));

        WorkoutSessionResponse response = sessionService.startSession(userId, request);

        assertThat(response).isNotNull();
        assertThat(response.previousNotes()).isEqualTo("Heavy bench press 100kg");
    }

    @Test
    void replaceSessionExercise_WithCustomPrescription_UpdatesSetsAndReps() {
        UUID sessionId = UUID.randomUUID();
        UUID sessionExerciseId = UUID.randomUUID();
        UUID newExerciseId = UUID.randomUUID();

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setUserId(userId);

        com.trainingapp.training.domain.Exercise oldEx = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(oldEx, "id", UUID.randomUUID());
        oldEx.setName("Bench Press");

        com.trainingapp.training.domain.Exercise newEx = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(newEx, "id", newExerciseId);
        newEx.setName("Incline Dumbbell Press");

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", sessionExerciseId);
        se.setSession(session);
        se.setExercise(oldEx);
        se.setSets(3);
        se.setReps(8);
        se.setRepsMax(12);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(se));
        when(exerciseRepository.findById(newExerciseId)).thenReturn(Optional.of(newEx));
        when(setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId)).thenReturn(List.of());
        when(sessionExerciseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        com.trainingapp.training.dto.SessionExerciseReplaceRequest req =
            new com.trainingapp.training.dto.SessionExerciseReplaceRequest(newExerciseId, 4, 12, 15, false);

        com.trainingapp.training.dto.SessionExerciseResponse response =
            sessionService.replaceSessionExercise(sessionId, userId, sessionExerciseId, req);

        assertThat(response.exercise().name()).isEqualTo("Incline Dumbbell Press");
        assertThat(response.sets()).isEqualTo(4);
        assertThat(response.reps()).isEqualTo(12);
        assertThat(response.repsMax()).isEqualTo(15);
    }

    @Test
    void replaceSessionExercise_WithoutCustomPrescription_KeepsExistingSetsAndReps() {
        UUID sessionId = UUID.randomUUID();
        UUID sessionExerciseId = UUID.randomUUID();
        UUID newExerciseId = UUID.randomUUID();

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setUserId(userId);

        com.trainingapp.training.domain.Exercise oldEx = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(oldEx, "id", UUID.randomUUID());
        oldEx.setName("Bench Press");

        com.trainingapp.training.domain.Exercise newEx = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(newEx, "id", newExerciseId);
        newEx.setName("Chest Flyes");

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", sessionExerciseId);
        se.setSession(session);
        se.setExercise(oldEx);
        se.setSets(3);
        se.setReps(10);
        se.setRepsMax(null);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(se));
        when(exerciseRepository.findById(newExerciseId)).thenReturn(Optional.of(newEx));
        when(setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId)).thenReturn(List.of());
        when(sessionExerciseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        com.trainingapp.training.dto.SessionExerciseReplaceRequest req =
            new com.trainingapp.training.dto.SessionExerciseReplaceRequest(newExerciseId, null, null, null, null);

        com.trainingapp.training.dto.SessionExerciseResponse response =
            sessionService.replaceSessionExercise(sessionId, userId, sessionExerciseId, req);

        assertThat(response.exercise().name()).isEqualTo("Chest Flyes");
        assertThat(response.sets()).isEqualTo(3);
        assertThat(response.reps()).isEqualTo(10);
        assertThat(response.repsMax()).isNull();
    }
}
