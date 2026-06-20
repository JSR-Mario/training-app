package com.trainingapp.training.service;

import com.trainingapp.training.client.AnalyticsNotificationClient;
import com.trainingapp.training.domain.DayTemplate;
import com.trainingapp.training.domain.TrainingProgram;
import com.trainingapp.training.domain.WeekTemplate;
import com.trainingapp.training.domain.WorkoutSession;
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

        sessionService.completeSession(sessionId, userId);

        assertThat(session.getCompletedAt()).isNotNull();
        verify(sessionRepository).save(session);
        verify(analyticsClient).notifySessionCompleted(any());
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
}
