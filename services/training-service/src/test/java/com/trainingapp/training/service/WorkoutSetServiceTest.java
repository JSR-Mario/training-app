package com.trainingapp.training.service;

import com.trainingapp.training.domain.SessionExercise;
import com.trainingapp.training.domain.DayTemplate;
import com.trainingapp.training.domain.WorkoutSession;
import com.trainingapp.training.domain.WorkoutSet;
import com.trainingapp.training.dto.WorkoutSetRequest;
import com.trainingapp.training.dto.WorkoutSetResponse;
import com.trainingapp.training.repository.SessionExerciseRepository;
import com.trainingapp.training.repository.WorkoutSessionRepository;
import com.trainingapp.training.repository.WorkoutSetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkoutSetServiceTest {

    @Mock private WorkoutSetRepository setRepository;
    @Mock private WorkoutSessionRepository sessionRepository;
    @Mock private SessionExerciseRepository sessionExerciseRepository;

    @InjectMocks private WorkoutSetService setService;

    private UUID userId;
    private UUID sessionId;
    private UUID sessionExerciseId;
    private WorkoutSession session;
    private SessionExercise sessionExercise;
    private com.trainingapp.training.domain.Exercise exercise;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        sessionId = UUID.randomUUID();
        sessionExerciseId = UUID.randomUUID();

        DayTemplate template = new DayTemplate();
        ReflectionTestUtils.setField(template, "id", UUID.randomUUID());

        session = new WorkoutSession();
        ReflectionTestUtils.setField(session, "id", sessionId);
        session.setUserId(userId);
        session.setDayTemplate(template);

        sessionExercise = new SessionExercise();
        ReflectionTestUtils.setField(sessionExercise, "id", sessionExerciseId);
        sessionExercise.setSession(session);
        
        exercise = new com.trainingapp.training.domain.Exercise();
        ReflectionTestUtils.setField(exercise, "id", UUID.randomUUID());
        exercise.setUnilateral(false);
        sessionExercise.setExercise(exercise);
    }

    @Test
    void logSet_Success() {
        WorkoutSetRequest request = new WorkoutSetRequest(sessionExerciseId, 1, 10, null, BigDecimal.valueOf(50.0));

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(sessionExercise));

        WorkoutSet savedSet = new WorkoutSet();
        ReflectionTestUtils.setField(savedSet, "id", UUID.randomUUID());
        savedSet.setSession(session);
        savedSet.setSessionExercise(sessionExercise);
        savedSet.setSetNumber(1);
        savedSet.setRepsCompleted(10);
        savedSet.setWeightKg(BigDecimal.valueOf(50.5));
        savedSet.setLoggedAt(java.time.Instant.now());

        when(setRepository.save(any(WorkoutSet.class))).thenReturn(savedSet);

        WorkoutSetResponse response = setService.logSet(sessionId, userId, request);

        assertThat(response).isNotNull();
        assertThat(response.repsCompleted()).isEqualTo(10);
        assertThat(response.weightKg()).isEqualTo(BigDecimal.valueOf(50.5));
    }

    @Test
    void logSet_ThrowsBadRequest_WhenSessionCompleted() {
        session.setCompletedAt(java.time.Instant.now());
        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));

        WorkoutSetRequest request = new WorkoutSetRequest(sessionExerciseId, 1, 10, null, BigDecimal.TEN);

        assertThatThrownBy(() -> setService.logSet(sessionId, userId, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cannot log sets for a completed session");
    }

    @Test
    void logSet_ThrowsBadRequest_WhenExerciseNotBelongToDay() {
        // Change session
        WorkoutSession otherSession = new WorkoutSession();
        ReflectionTestUtils.setField(otherSession, "id", UUID.randomUUID());
        sessionExercise.setSession(otherSession);

        WorkoutSetRequest request = new WorkoutSetRequest(sessionExerciseId, 1, 10, null, BigDecimal.TEN);

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(sessionExercise));

        assertThatThrownBy(() -> setService.logSet(sessionId, userId, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Exercise does not belong to this session");
    }

    @Test
    void logSet_DoesNotMarkNewPr_WhenRepsFewerThanExistingPrAtSameWeight() {
        WorkoutSetRequest request = new WorkoutSetRequest(sessionExerciseId, 1, 14, null, BigDecimal.valueOf(99.0));

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(sessionExercise));

        WorkoutSet savedSet = new WorkoutSet();
        ReflectionTestUtils.setField(savedSet, "id", UUID.randomUUID());
        savedSet.setSession(session);
        savedSet.setSessionExercise(sessionExercise);
        savedSet.setSetNumber(1);
        savedSet.setRepsCompleted(14);
        savedSet.setWeightKg(BigDecimal.valueOf(99.0));

        when(setRepository.save(any(WorkoutSet.class))).thenReturn(savedSet);

        // Existing PR in bucket "11-15" is 99kg x 15 reps
        com.trainingapp.training.dto.ExercisePrProjection existingPr = mock(com.trainingapp.training.dto.ExercisePrProjection.class);
        when(existingPr.getExerciseId()).thenReturn(exercise.getId());
        when(existingPr.getBucket()).thenReturn("11-15");
        when(existingPr.getPrWeight()).thenReturn(BigDecimal.valueOf(99.0));
        when(existingPr.getPrReps()).thenReturn(15);

        when(setRepository.findPersonalRecordsByUserIdExcludingSession(eq(userId), any())).thenReturn(java.util.List.of(existingPr));

        WorkoutSetResponse response = setService.logSet(sessionId, userId, request);

        assertThat(response).isNotNull();
        assertThat(response.isNewPr()).isFalse();
    }

    @Test
    void logSet_ReturnsWarning_WhenRepsBelowTargetRepRange() {
        sessionExercise.setReps(8);
        sessionExercise.setRepsMax(12);
        sessionExercise.setAmrap(false);

        WorkoutSetRequest request = new WorkoutSetRequest(sessionExerciseId, 1, 6, null, BigDecimal.valueOf(100.0));

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(sessionExercise));

        WorkoutSet savedSet = new WorkoutSet();
        ReflectionTestUtils.setField(savedSet, "id", UUID.randomUUID());
        savedSet.setSession(session);
        savedSet.setSessionExercise(sessionExercise);
        savedSet.setSetNumber(1);
        savedSet.setRepsCompleted(6);
        savedSet.setWeightKg(BigDecimal.valueOf(100.0));

        when(setRepository.save(any(WorkoutSet.class))).thenReturn(savedSet);
        when(setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId)).thenReturn(java.util.List.of(savedSet));

        WorkoutSetResponse response = setService.logSet(sessionId, userId, request);

        assertThat(response).isNotNull();
        assertThat(response.performanceStatus()).isEqualTo("WARNING");
    }

    @Test
    void logSet_ReturnsWarning_WhenUnilateralRepsBelowTargetRepRange() {
        exercise.setUnilateral(true);
        sessionExercise.setReps(10);
        sessionExercise.setAmrap(false);

        WorkoutSetRequest request = new WorkoutSetRequest(sessionExerciseId, 1, 10, 8, BigDecimal.valueOf(20.0));

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(sessionExercise));

        WorkoutSet savedSet = new WorkoutSet();
        ReflectionTestUtils.setField(savedSet, "id", UUID.randomUUID());
        savedSet.setSession(session);
        savedSet.setSessionExercise(sessionExercise);
        savedSet.setSetNumber(1);
        savedSet.setRepsCompleted(10);
        savedSet.setRepsCompletedRight(8);
        savedSet.setWeightKg(BigDecimal.valueOf(20.0));

        when(setRepository.save(any(WorkoutSet.class))).thenReturn(savedSet);
        when(setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId)).thenReturn(java.util.List.of(savedSet));

        WorkoutSetResponse response = setService.logSet(sessionId, userId, request);

        assertThat(response).isNotNull();
        assertThat(response.performanceStatus()).isEqualTo("WARNING");
    }

    @Test
    void logSet_ReturnsGood_WhenExerciseIsAmrapEvenIfRepsBelowTarget() {
        sessionExercise.setReps(10);
        sessionExercise.setAmrap(true);

        WorkoutSetRequest request = new WorkoutSetRequest(sessionExerciseId, 1, 5, null, BigDecimal.valueOf(50.0));

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(sessionExercise));

        WorkoutSet savedSet = new WorkoutSet();
        ReflectionTestUtils.setField(savedSet, "id", UUID.randomUUID());
        savedSet.setSession(session);
        savedSet.setSessionExercise(sessionExercise);
        savedSet.setSetNumber(1);
        savedSet.setRepsCompleted(5);
        savedSet.setWeightKg(BigDecimal.valueOf(50.0));

        when(setRepository.save(any(WorkoutSet.class))).thenReturn(savedSet);
        when(setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId)).thenReturn(java.util.List.of(savedSet));

        WorkoutSetResponse response = setService.logSet(sessionId, userId, request);

        assertThat(response).isNotNull();
        assertThat(response.performanceStatus()).isEqualTo("GOOD");
    }

    @Test
    void logSet_ReturnsCritical_WhenPerformanceDropsBelow70Percent() {
        sessionExercise.setReps(8);
        sessionExercise.setAmrap(false);

        WorkoutSet previousSet = new WorkoutSet();
        ReflectionTestUtils.setField(previousSet, "id", UUID.randomUUID());
        previousSet.setSession(session);
        previousSet.setSessionExercise(sessionExercise);
        previousSet.setSetNumber(1);
        previousSet.setRepsCompleted(10);
        previousSet.setWeightKg(BigDecimal.valueOf(100.0)); // perf = 1000

        WorkoutSet currentSet = new WorkoutSet();
        ReflectionTestUtils.setField(currentSet, "id", UUID.randomUUID());
        currentSet.setSession(session);
        currentSet.setSessionExercise(sessionExercise);
        currentSet.setSetNumber(2);
        currentSet.setRepsCompleted(6);
        currentSet.setWeightKg(BigDecimal.valueOf(100.0)); // perf = 600 (ratio 0.60 < 0.70)

        WorkoutSetRequest request = new WorkoutSetRequest(sessionExerciseId, 2, 6, null, BigDecimal.valueOf(100.0));

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(sessionExercise));
        when(setRepository.save(any(WorkoutSet.class))).thenReturn(currentSet);
        when(setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId)).thenReturn(java.util.List.of(previousSet, currentSet));

        WorkoutSetResponse response = setService.logSet(sessionId, userId, request);

        assertThat(response).isNotNull();
        assertThat(response.performanceStatus()).isEqualTo("CRITICAL");
    }

    @Test
    void logSet_ReturnsGood_WhenRepsAndPerformanceMeetTarget() {
        sessionExercise.setReps(8);
        sessionExercise.setRepsMax(12);
        sessionExercise.setAmrap(false);

        WorkoutSetRequest request = new WorkoutSetRequest(sessionExerciseId, 1, 10, null, BigDecimal.valueOf(80.0));

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(sessionExercise));

        WorkoutSet savedSet = new WorkoutSet();
        ReflectionTestUtils.setField(savedSet, "id", UUID.randomUUID());
        savedSet.setSession(session);
        savedSet.setSessionExercise(sessionExercise);
        savedSet.setSetNumber(1);
        savedSet.setRepsCompleted(10);
        savedSet.setWeightKg(BigDecimal.valueOf(80.0));

        when(setRepository.save(any(WorkoutSet.class))).thenReturn(savedSet);
        when(setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId)).thenReturn(java.util.List.of(savedSet));

        WorkoutSetResponse response = setService.logSet(sessionId, userId, request);

        assertThat(response).isNotNull();
        assertThat(response.performanceStatus()).isEqualTo("GOOD");
    }

    @Test
    void logSet_UnilateralPr_EvaluatesLimitingSideForPrBucket() {
        exercise.setUnilateral(true);

        WorkoutSetRequest request = new WorkoutSetRequest(sessionExerciseId, 1, 20, 15, BigDecimal.valueOf(80.0));

        when(sessionRepository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(session));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(sessionExercise));

        WorkoutSet savedSet = new WorkoutSet();
        ReflectionTestUtils.setField(savedSet, "id", UUID.randomUUID());
        savedSet.setSession(session);
        savedSet.setSessionExercise(sessionExercise);
        savedSet.setSetNumber(1);
        savedSet.setRepsCompleted(20);
        savedSet.setRepsCompletedRight(15);
        savedSet.setWeightKg(BigDecimal.valueOf(80.0));

        when(setRepository.save(any(WorkoutSet.class))).thenReturn(savedSet);

        // Existing PR in bucket "11-15" is 80kg x 15 reps
        com.trainingapp.training.dto.ExercisePrProjection existingPr = mock(com.trainingapp.training.dto.ExercisePrProjection.class);
        when(existingPr.getExerciseId()).thenReturn(exercise.getId());
        when(existingPr.getBucket()).thenReturn("11-15");
        when(existingPr.getPrWeight()).thenReturn(BigDecimal.valueOf(80.0));
        when(existingPr.getPrReps()).thenReturn(15);

        when(setRepository.findPersonalRecordsByUserIdExcludingSession(eq(userId), any())).thenReturn(java.util.List.of(existingPr));

        WorkoutSetResponse response = setService.logSet(sessionId, userId, request);

        assertThat(response).isNotNull();
        // Limiting side is 15 reps, which matches existing 80kg x 15 reps in bucket 11-15, so isNewPr is false
        assertThat(response.isNewPr()).isFalse();
    }
}
