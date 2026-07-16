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
}
