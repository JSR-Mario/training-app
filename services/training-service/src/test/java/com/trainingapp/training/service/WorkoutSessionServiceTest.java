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
        set2.setWeightKg(java.math.BigDecimal.valueOf(88));
        set2.setRepsCompleted(9); // Perf = 792 (79.2% -> warning)

        WorkoutSet set3 = new WorkoutSet();
        set3.setSession(pastSession);
        set3.setWeightKg(java.math.BigDecimal.valueOf(88));
        set3.setRepsCompleted(9); // Perf = 792 (79.2% -> warning)

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
            new com.trainingapp.training.dto.SessionExerciseReplaceRequest(newExerciseId, null, null, null, null, false);

        com.trainingapp.training.dto.SessionExerciseResponse response =
            sessionService.replaceSessionExercise(sessionId, userId, sessionExerciseId, req);

        assertThat(response.exercise().name()).isEqualTo("Chest Flyes");
        assertThat(response.sets()).isEqualTo(3);
        assertThat(response.reps()).isEqualTo(10);
        assertThat(response.repsMax()).isNull();
    }

    @Test
    void addSessionExercise_WithSaveToDayTemplate_PersistsToDayExercise() {
        UUID sessionId = UUID.randomUUID();
        UUID exerciseId = UUID.randomUUID();

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setUserId(userId);
        session.setDayTemplate(dayTemplate);

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", exerciseId);
        ex.setName("Overhead Press");

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(exerciseRepository.findById(exerciseId)).thenReturn(Optional.of(ex));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of());
        when(sessionExerciseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayTemplateId)).thenReturn(List.of());

        com.trainingapp.training.dto.SessionExerciseRequest req =
            new com.trainingapp.training.dto.SessionExerciseRequest(exerciseId, 4, 8, 10, false, true);

        com.trainingapp.training.dto.SessionExerciseResponse response =
            sessionService.addSessionExercise(sessionId, userId, req);

        assertThat(response).isNotNull();
        assertThat(response.exercise().name()).isEqualTo("Overhead Press");

        ArgumentCaptor<com.trainingapp.training.domain.DayExercise> deCaptor =
            ArgumentCaptor.forClass(com.trainingapp.training.domain.DayExercise.class);
        verify(dayExerciseRepository).save(deCaptor.capture());
        assertThat(deCaptor.getValue().getExercise().getName()).isEqualTo("Overhead Press");
        assertThat(deCaptor.getValue().getSets()).isEqualTo(4);
        assertThat(deCaptor.getValue().getReps()).isEqualTo(8);
        assertThat(deCaptor.getValue().getRepsMax()).isEqualTo(10);
    }

    @Test
    void replaceSessionExercise_WithSaveToDayTemplate_UpdatesDayExercise() {
        UUID sessionId = UUID.randomUUID();
        UUID sessionExerciseId = UUID.randomUUID();
        UUID oldExerciseId = UUID.randomUUID();
        UUID newExerciseId = UUID.randomUUID();

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setUserId(userId);
        session.setDayTemplate(dayTemplate);

        com.trainingapp.training.domain.Exercise oldEx = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(oldEx, "id", oldExerciseId);
        oldEx.setName("Old Bench");

        com.trainingapp.training.domain.Exercise newEx = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(newEx, "id", newExerciseId);
        newEx.setName("New Incline Bench");

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", sessionExerciseId);
        se.setSession(session);
        se.setExercise(oldEx);
        se.setSets(3);
        se.setReps(10);

        com.trainingapp.training.domain.DayExercise existingDe = new com.trainingapp.training.domain.DayExercise();
        existingDe.setDayTemplate(dayTemplate);
        existingDe.setExercise(oldEx);
        existingDe.setSets(3);
        existingDe.setReps(10);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(se));
        when(exerciseRepository.findById(newExerciseId)).thenReturn(Optional.of(newEx));
        when(setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId)).thenReturn(List.of());
        when(sessionExerciseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayTemplateId)).thenReturn(List.of(existingDe));

        com.trainingapp.training.dto.SessionExerciseReplaceRequest req =
            new com.trainingapp.training.dto.SessionExerciseReplaceRequest(newExerciseId, 4, 12, 15, false, true);

        com.trainingapp.training.dto.SessionExerciseResponse response =
            sessionService.replaceSessionExercise(sessionId, userId, sessionExerciseId, req);

        assertThat(response.exercise().name()).isEqualTo("New Incline Bench");

        ArgumentCaptor<com.trainingapp.training.domain.DayExercise> deCaptor =
            ArgumentCaptor.forClass(com.trainingapp.training.domain.DayExercise.class);
        verify(dayExerciseRepository).save(deCaptor.capture());
        assertThat(deCaptor.getValue().getExercise().getName()).isEqualTo("New Incline Bench");
        assertThat(deCaptor.getValue().getSets()).isEqualTo(4);
        assertThat(deCaptor.getValue().getReps()).isEqualTo(12);
        assertThat(deCaptor.getValue().getRepsMax()).isEqualTo(15);
    }

    @Test
    void getExerciseSuggestions_SameDayTemplate_IgnoresHistoricalSetsOutsideRepRange() {
        UUID sessionId = UUID.randomUUID();
        UUID dayTemplateId = UUID.randomUUID();
        com.trainingapp.training.domain.DayTemplate dt = new com.trainingapp.training.domain.DayTemplate();
        ReflectionTestUtils.setField(dt, "id", dayTemplateId);

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setDayTemplate(dt);
        session.setPerformedOn(LocalDate.now());

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());
        ex.setUnilateral(true);

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", UUID.randomUUID());
        se.setExercise(ex);
        se.setReps(20);
        se.setRepsMax(30);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(se));

        // PR in 11-15 bucket (outside 20-30 rep range)
        com.trainingapp.training.dto.ExercisePrProjection pr = mock(com.trainingapp.training.dto.ExercisePrProjection.class);
        when(pr.getExerciseId()).thenReturn(ex.getId());
        when(pr.getBucket()).thenReturn("11-15");
        lenient().when(pr.getPrWeight()).thenReturn(java.math.BigDecimal.valueOf(80.0));
        lenient().when(pr.getPrReps()).thenReturn(15);
        when(setRepository.findPersonalRecordsByUserId(userId)).thenReturn(List.of(pr));
        when(bodyWeightRepository.findFirstByUserIdOrderByDateDesc(userId)).thenReturn(Optional.empty());

        // Previous session of same Day Template had 80kg x 15 reps on each side
        WorkoutSession pastSameDaySession = new WorkoutSession();
        ReflectionTestUtils.setField(pastSameDaySession, "id", UUID.randomUUID());
        pastSameDaySession.setDayTemplate(dt);
        pastSameDaySession.setPerformedOn(LocalDate.now().minusDays(7));

        com.trainingapp.training.domain.WorkoutSet set1 = new com.trainingapp.training.domain.WorkoutSet();
        set1.setSession(pastSameDaySession);
        set1.setSetNumber(1);
        set1.setWeightKg(java.math.BigDecimal.valueOf(80.0));
        set1.setRepsCompleted(15);
        set1.setRepsCompletedRight(15);

        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(List.of(set1));

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        // Previous 15-rep sets must not be suggested for a 20-30 rep range
        assertThat(suggestions.get(0).previousSets()).isEmpty();
        assertThat(suggestions.get(0).hadFatigueLastWeek()).isFalse();
        assertThat(suggestions.get(0).suggestAddWeight()).isFalse();
        // Suggested weight is null because no PR in 16-20, 21-25, 26-30, 31+ buckets
        assertThat(suggestions.get(0).suggestedWeightKg()).isNull();
        // Suggested reps is the midpoint (25)
        assertThat(suggestions.get(0).suggestedReps()).isEqualTo(25);
    }

    @Test
    void getExerciseSuggestions_UnilateralExercise_EvaluatesLimitingSideForRepCompatibility() {
        UUID sessionId = UUID.randomUUID();

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
        when(setRepository.findPersonalRecordsByUserId(userId)).thenReturn(List.of());
        when(bodyWeightRepository.findFirstByUserIdOrderByDateDesc(userId)).thenReturn(Optional.empty());

        // Previous session had 10 reps Left, but only 3 reps Right (limiting side = 3, bucket 1-5, outside 10-15 target)
        WorkoutSession pastSession = new WorkoutSession();
        ReflectionTestUtils.setField(pastSession, "id", UUID.randomUUID());
        pastSession.setPerformedOn(LocalDate.now().minusDays(5));

        com.trainingapp.training.domain.WorkoutSet set1 = new com.trainingapp.training.domain.WorkoutSet();
        set1.setSession(pastSession);
        set1.setSetNumber(1);
        set1.setWeightKg(java.math.BigDecimal.valueOf(50.0));
        set1.setRepsCompleted(10);
        set1.setRepsCompletedRight(3);

        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(List.of(set1));

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        // Limiting side (3 reps) is outside the 10-15 target range, so previous sets must be omitted
        assertThat(suggestions.get(0).previousSets()).isEmpty();
    }

    @Test
    void getExerciseSuggestions_PrWithRepsBelowTargetRange_IsExcluded() {
        UUID sessionId = UUID.randomUUID();

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setPerformedOn(LocalDate.now());

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());
        ex.setUnilateral(true);

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", UUID.randomUUID());
        se.setExercise(ex);
        se.setReps(20);
        se.setRepsMax(30);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(se));

        // PR in 16-20 bucket (overlapping with 20-30), but PR reps was only 16 (below minReps - 2 = 18)
        com.trainingapp.training.dto.ExercisePrProjection pr = mock(com.trainingapp.training.dto.ExercisePrProjection.class);
        when(pr.getExerciseId()).thenReturn(ex.getId());
        when(pr.getBucket()).thenReturn("16-20");
        lenient().when(pr.getPrWeight()).thenReturn(java.math.BigDecimal.valueOf(80.0));
        lenient().when(pr.getPrReps()).thenReturn(16);
        when(setRepository.findPersonalRecordsByUserId(userId)).thenReturn(List.of(pr));
        when(bodyWeightRepository.findFirstByUserIdOrderByDateDesc(userId)).thenReturn(Optional.empty());

        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(Collections.emptyList());

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        // PR was done with 16 reps, which is below the 20-30 rep range (16 < 18), so suggestedWeightKg must be null
        assertThat(suggestions.get(0).suggestedWeightKg()).isNull();
        assertThat(suggestions.get(0).suggestedReps()).isEqualTo(25);
    }

    @Test
    void getExerciseSuggestions_SessionWithMixedReps_FiltersIndividualSets() {
        UUID sessionId = UUID.randomUUID();

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setPerformedOn(LocalDate.now());

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());
        ex.setUnilateral(true);

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", UUID.randomUUID());
        se.setExercise(ex);
        se.setReps(20);
        se.setRepsMax(30);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(se));
        when(setRepository.findPersonalRecordsByUserId(userId)).thenReturn(List.of());
        when(bodyWeightRepository.findFirstByUserIdOrderByDateDesc(userId)).thenReturn(Optional.empty());

        WorkoutSession pastSession = new WorkoutSession();
        ReflectionTestUtils.setField(pastSession, "id", UUID.randomUUID());
        pastSession.setPerformedOn(LocalDate.now().minusDays(3));

        // Set 1: 15/15 reps (out of range)
        com.trainingapp.training.domain.WorkoutSet set1 = new com.trainingapp.training.domain.WorkoutSet();
        set1.setSession(pastSession);
        set1.setSetNumber(1);
        set1.setWeightKg(java.math.BigDecimal.valueOf(80.0));
        set1.setRepsCompleted(15);
        set1.setRepsCompletedRight(15);

        // Set 2: 16/16 reps (out of range, 16 < 19)
        com.trainingapp.training.domain.WorkoutSet set2 = new com.trainingapp.training.domain.WorkoutSet();
        set2.setSession(pastSession);
        set2.setSetNumber(2);
        set2.setWeightKg(java.math.BigDecimal.valueOf(80.0));
        set2.setRepsCompleted(16);
        set2.setRepsCompletedRight(16);

        // Set 3: 20/20 reps (in range)
        com.trainingapp.training.domain.WorkoutSet set3 = new com.trainingapp.training.domain.WorkoutSet();
        set3.setSession(pastSession);
        set3.setSetNumber(3);
        set3.setWeightKg(java.math.BigDecimal.valueOf(60.0));
        set3.setRepsCompleted(20);
        set3.setRepsCompletedRight(20);

        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(List.of(set1, set2, set3));

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        // Only Set 3 (20 reps) is within the 20-30 range, Set 1 (15) and Set 2 (16) must be filtered out
        assertThat(suggestions.get(0).previousSets()).hasSize(1);
        assertThat(suggestions.get(0).previousSets().get(0).setNumber()).isEqualTo(3);
        assertThat(suggestions.get(0).previousSets().get(0).reps()).isEqualTo(20);
        assertThat(suggestions.get(0).previousSets().get(0).weightKg()).isEqualByComparingTo("60.0");
    }

    @Test
    void getExerciseSuggestions_BoundaryReps18_ExcludedFromRange20to30() {
        UUID sessionId = UUID.randomUUID();

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setPerformedOn(LocalDate.now());

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());
        ex.setUnilateral(false);

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", UUID.randomUUID());
        se.setExercise(ex);
        se.setReps(20);
        se.setRepsMax(30);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(se));
        when(setRepository.findPersonalRecordsByUserId(userId)).thenReturn(List.of());
        when(bodyWeightRepository.findFirstByUserIdOrderByDateDesc(userId)).thenReturn(Optional.empty());

        // Historical session with 18 reps (the exact bug scenario: just below new tolerance of minReps-1=19)
        WorkoutSession pastSession = new WorkoutSession();
        ReflectionTestUtils.setField(pastSession, "id", UUID.randomUUID());
        pastSession.setPerformedOn(LocalDate.now().minusDays(7));

        com.trainingapp.training.domain.WorkoutSet set1 = new com.trainingapp.training.domain.WorkoutSet();
        set1.setSession(pastSession);
        set1.setSetNumber(1);
        set1.setWeightKg(java.math.BigDecimal.valueOf(27));
        set1.setRepsCompleted(18);

        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(List.of(set1));

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        // 18 reps < 19 (minReps-1), so the set must be excluded
        assertThat(suggestions.get(0).previousSets()).isEmpty();
        assertThat(suggestions.get(0).hadFatigueLastWeek()).isFalse();
        assertThat(suggestions.get(0).suggestAddWeight()).isFalse();
    }

    @Test
    void getExerciseSuggestions_RepRangeChanged_SuppressesFatigueAndSetsFlag() {
        UUID sessionId = UUID.randomUUID();

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setPerformedOn(LocalDate.now());

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());
        ex.setUnilateral(false);

        // Current exercise: 10-15 rep range
        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", UUID.randomUUID());
        se.setExercise(ex);
        se.setReps(10);
        se.setRepsMax(15);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(se));
        when(setRepository.findPersonalRecordsByUserId(userId)).thenReturn(List.of());
        when(bodyWeightRepository.findFirstByUserIdOrderByDateDesc(userId)).thenReturn(Optional.empty());

        // Historical session with different rep range (reps=8, repsMax=12)
        WorkoutSession pastSession = new WorkoutSession();
        ReflectionTestUtils.setField(pastSession, "id", UUID.randomUUID());
        pastSession.setPerformedOn(LocalDate.now().minusDays(7));

        com.trainingapp.training.domain.SessionExercise pastSe = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(pastSe, "id", UUID.randomUUID());
        pastSe.setExercise(ex);
        pastSe.setReps(8);
        pastSe.setRepsMax(12);

        // Sets at 12 reps (within current tolerance [9, 20]) but from a different rep range
        com.trainingapp.training.domain.WorkoutSet set1 = new com.trainingapp.training.domain.WorkoutSet();
        set1.setSession(pastSession);
        set1.setSessionExercise(pastSe);
        set1.setSetNumber(1);
        set1.setWeightKg(java.math.BigDecimal.valueOf(50));
        set1.setRepsCompleted(12); // Perf = 600 (max)

        com.trainingapp.training.domain.WorkoutSet set2 = new com.trainingapp.training.domain.WorkoutSet();
        set2.setSession(pastSession);
        set2.setSessionExercise(pastSe);
        set2.setSetNumber(2);
        set2.setWeightKg(java.math.BigDecimal.valueOf(40));
        set2.setRepsCompleted(10); // Perf = 400 (66.7% -> critical, would trigger fatigue)

        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(List.of(set1, set2));

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        // Rep range changed: old was 8-12, current is 10-15
        assertThat(suggestions.get(0).repRangeChanged()).isTrue();
        // Fatigue must be suppressed when rep range changed
        assertThat(suggestions.get(0).hadFatigueLastWeek()).isFalse();
    }

    @Test
    void getExerciseSuggestions_SameRepRange_ShowsFatigueNormally() {
        UUID sessionId = UUID.randomUUID();

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setPerformedOn(LocalDate.now());

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());
        ex.setUnilateral(false);

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", UUID.randomUUID());
        se.setExercise(ex);
        se.setReps(10);
        se.setRepsMax(15);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(se));
        when(setRepository.findPersonalRecordsByUserId(userId)).thenReturn(List.of());
        when(bodyWeightRepository.findFirstByUserIdOrderByDateDesc(userId)).thenReturn(Optional.empty());

        WorkoutSession pastSession = new WorkoutSession();
        ReflectionTestUtils.setField(pastSession, "id", UUID.randomUUID());
        pastSession.setPerformedOn(LocalDate.now().minusDays(7));

        // Same rep range as current
        com.trainingapp.training.domain.SessionExercise pastSe = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(pastSe, "id", UUID.randomUUID());
        pastSe.setExercise(ex);
        pastSe.setReps(10);
        pastSe.setRepsMax(15);

        com.trainingapp.training.domain.WorkoutSet set1 = new com.trainingapp.training.domain.WorkoutSet();
        set1.setSession(pastSession);
        set1.setSessionExercise(pastSe);
        set1.setSetNumber(1);
        set1.setWeightKg(java.math.BigDecimal.valueOf(50));
        set1.setRepsCompleted(12); // Perf = 600 (max)

        com.trainingapp.training.domain.WorkoutSet set2 = new com.trainingapp.training.domain.WorkoutSet();
        set2.setSession(pastSession);
        set2.setSessionExercise(pastSe);
        set2.setSetNumber(2);
        set2.setWeightKg(java.math.BigDecimal.valueOf(40));
        set2.setRepsCompleted(10); // Perf = 400 (66.7% -> critical)

        when(setRepository.findHistoricalSetsForExercise(ex.getId(), userId, session.getPerformedOn()))
            .thenReturn(List.of(set1, set2));

        List<com.trainingapp.training.dto.ExerciseSuggestionResponse> suggestions = sessionService.getExerciseSuggestions(sessionId, userId);

        assertThat(suggestions).hasSize(1);
        // Same rep range: fatigue should be detected normally
        assertThat(suggestions.get(0).repRangeChanged()).isFalse();
        assertThat(suggestions.get(0).hadFatigueLastWeek()).isTrue();
    }

    @Test
    void syncSessionExercises_UpdatesExisting_AddsNew_RemovesUnusedWithoutSets() {
        UUID sessionId = UUID.randomUUID();
        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setDayTemplate(dayTemplate);

        com.trainingapp.training.domain.Exercise exA = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(exA, "id", UUID.randomUUID());
        com.trainingapp.training.domain.Exercise exB = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(exB, "id", UUID.randomUUID());
        com.trainingapp.training.domain.Exercise exC = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(exC, "id", UUID.randomUUID());

        com.trainingapp.training.domain.SessionExercise seA = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(seA, "id", UUID.randomUUID());
        seA.setSession(session);
        seA.setExercise(exA);
        seA.setSets(3);
        seA.setReps(10);
        seA.setSortOrder(0);

        com.trainingapp.training.domain.SessionExercise seB = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(seB, "id", UUID.randomUUID());
        seB.setSession(session);
        seB.setExercise(exB);
        seB.setSets(3);
        seB.setReps(10);
        seB.setSortOrder(1);

        com.trainingapp.training.domain.DayExercise deA = new com.trainingapp.training.domain.DayExercise();
        ReflectionTestUtils.setField(deA, "id", UUID.randomUUID());
        deA.setDayTemplate(dayTemplate);
        deA.setExercise(exA);
        deA.setSets(4); // Changed from 3 to 4
        deA.setReps(12);
        deA.setSortOrder(0);

        com.trainingapp.training.domain.DayExercise deC = new com.trainingapp.training.domain.DayExercise();
        ReflectionTestUtils.setField(deC, "id", UUID.randomUUID());
        deC.setDayTemplate(dayTemplate);
        deC.setExercise(exC);
        deC.setSets(3);
        deC.setReps(8);
        deC.setSortOrder(1);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayTemplateId)).thenReturn(List.of(deA, deC));
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(seA, seB));
        when(setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId)).thenReturn(Collections.emptyList());

        WorkoutSessionResponse response = sessionService.syncSessionExercises(sessionId, userId);

        assertThat(response).isNotNull();
        // Existing exercise A updated
        assertThat(seA.getSets()).isEqualTo(4);
        assertThat(seA.getReps()).isEqualTo(12);
        verify(sessionExerciseRepository).save(seA);

        // New exercise C added
        verify(sessionExerciseRepository).save(argThat(se -> se.getExercise().equals(exC) && se.getSets() == 3));

        // Removed exercise B deleted (no logged sets)
        verify(sessionExerciseRepository).delete(seB);
    }

    @Test
    void syncSessionExercises_RetainsRemovedExerciseIfHasLoggedSets() {
        UUID sessionId = UUID.randomUUID();
        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setDayTemplate(dayTemplate);

        com.trainingapp.training.domain.Exercise exB = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(exB, "id", UUID.randomUUID());

        com.trainingapp.training.domain.SessionExercise seB = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(seB, "id", UUID.randomUUID());
        seB.setSession(session);
        seB.setExercise(exB);
        seB.setSets(3);

        com.trainingapp.training.domain.WorkoutSet loggedSet = new com.trainingapp.training.domain.WorkoutSet();
        loggedSet.setSession(session);
        loggedSet.setSessionExercise(seB);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayTemplateId)).thenReturn(Collections.emptyList());
        when(sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(sessionId)).thenReturn(List.of(seB));
        when(setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId)).thenReturn(List.of(loggedSet));

        sessionService.syncSessionExercises(sessionId, userId);

        // Exercise B has logged sets, so it must NOT be deleted
        verify(sessionExerciseRepository, never()).delete(seB);
    }

    @Test
    void syncSessionExercises_CompletedSession_DoesNothing() {
        UUID sessionId = UUID.randomUUID();
        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setCompletedAt(java.time.Instant.now());
        session.setDayTemplate(dayTemplate);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));

        sessionService.syncSessionExercises(sessionId, userId);

        verify(dayExerciseRepository, never()).findByDayTemplateIdOrderBySortOrderAsc(any());
        verify(sessionExerciseRepository, never()).save(any());
    }

    @Test
    void updateSessionExercise_Success_UpdatesAndOptionallySavesToDayTemplate() {
        UUID sessionId = UUID.randomUUID();
        UUID sessionExerciseId = UUID.randomUUID();

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setDayTemplate(dayTemplate);

        com.trainingapp.training.domain.Exercise ex = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(ex, "id", UUID.randomUUID());
        ex.setName("Bench Press");

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", sessionExerciseId);
        se.setSession(session);
        se.setExercise(ex);
        se.setSets(3);
        se.setReps(10);

        com.trainingapp.training.domain.DayExercise de = new com.trainingapp.training.domain.DayExercise();
        ReflectionTestUtils.setField(de, "id", UUID.randomUUID());
        de.setDayTemplate(dayTemplate);
        de.setExercise(ex);
        de.setSets(3);
        de.setReps(10);

        com.trainingapp.training.dto.SessionExerciseUpdateRequest request =
            new com.trainingapp.training.dto.SessionExerciseUpdateRequest(4, 12, 15, false, true);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(se));
        when(sessionExerciseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayTemplateId)).thenReturn(List.of(de));

        com.trainingapp.training.dto.SessionExerciseResponse response =
            sessionService.updateSessionExercise(sessionId, userId, sessionExerciseId, request);

        assertThat(response).isNotNull();
        assertThat(se.getSets()).isEqualTo(4);
        assertThat(se.getReps()).isEqualTo(12);
        assertThat(se.getRepsMax()).isEqualTo(15);
        assertThat(se.isAmrap()).isFalse();

        // Also check that day template was updated
        assertThat(de.getSets()).isEqualTo(4);
        assertThat(de.getReps()).isEqualTo(12);
        verify(dayExerciseRepository).save(de);
    }

    @Test
    void removeSessionExercise_DeletesSetsAndRatingsFirst() {
        UUID sessionId = UUID.randomUUID();
        UUID sessionExerciseId = UUID.randomUUID();

        WorkoutSession session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);

        com.trainingapp.training.domain.SessionExercise se = new com.trainingapp.training.domain.SessionExercise();
        ReflectionTestUtils.setField(se, "id", sessionExerciseId);
        se.setSession(session);

        com.trainingapp.training.domain.WorkoutSet set1 = new com.trainingapp.training.domain.WorkoutSet();
        set1.setSession(session);
        set1.setSessionExercise(se);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(se));
        when(setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId)).thenReturn(List.of(set1));

        sessionService.removeSessionExercise(sessionId, userId, sessionExerciseId);

        verify(setRepository).deleteAll(List.of(set1));
        verify(ratingRepository).deleteBySessionIdAndSessionExerciseId(sessionId, sessionExerciseId);
        verify(sessionExerciseRepository).delete(se);
    }
}
