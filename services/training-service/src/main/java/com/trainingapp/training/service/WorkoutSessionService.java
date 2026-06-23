package com.trainingapp.training.service;

import com.trainingapp.training.client.AnalyticsNotificationClient;
import com.trainingapp.training.domain.DayTemplate;
import com.trainingapp.training.domain.WorkoutSession;
import com.trainingapp.training.domain.WorkoutSet;
import com.trainingapp.training.dto.SessionCompletedEvent;
import com.trainingapp.training.dto.WorkoutSessionRequest;
import com.trainingapp.training.dto.WorkoutSessionResponse;
import com.trainingapp.training.dto.SessionNotesRequest;
import com.trainingapp.training.repository.DayTemplateRepository;
import com.trainingapp.training.repository.ExerciseBodyPartTargetRepository;
import com.trainingapp.training.repository.WorkoutSessionRepository;
import com.trainingapp.training.repository.WorkoutSetRepository;
import com.trainingapp.training.repository.SessionExerciseRatingRepository;
import com.trainingapp.training.repository.DayExerciseRepository;
import com.trainingapp.training.domain.SessionExerciseRating;
import com.trainingapp.training.domain.DayExercise;
import com.trainingapp.training.dto.SessionRatingRequest;
import com.trainingapp.training.dto.SessionRatingResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Service for managing workout sessions. */
@Service
@Transactional(readOnly = true)
public class WorkoutSessionService {

    private final WorkoutSessionRepository sessionRepository;
    private final DayTemplateRepository dayTemplateRepository;
    private final WorkoutSetRepository setRepository;
    private final ExerciseBodyPartTargetRepository targetRepository;
    private final AnalyticsNotificationClient analyticsClient;
    private final SessionExerciseRatingRepository ratingRepository;
    private final DayExerciseRepository dayExerciseRepository;

    public WorkoutSessionService(WorkoutSessionRepository sessionRepository,
                                 DayTemplateRepository dayTemplateRepository,
                                 WorkoutSetRepository setRepository,
                                 ExerciseBodyPartTargetRepository targetRepository,
                                 AnalyticsNotificationClient analyticsClient,
                                 SessionExerciseRatingRepository ratingRepository,
                                 DayExerciseRepository dayExerciseRepository) {
        this.sessionRepository = sessionRepository;
        this.dayTemplateRepository = dayTemplateRepository;
        this.setRepository = setRepository;
        this.targetRepository = targetRepository;
        this.analyticsClient = analyticsClient;
        this.ratingRepository = ratingRepository;
        this.dayExerciseRepository = dayExerciseRepository;
    }

    @Transactional
    public WorkoutSessionResponse startSession(UUID userId, WorkoutSessionRequest request) {
        DayTemplate dayTemplate = dayTemplateRepository.findById(request.dayTemplateId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Day template not found"));
            
        // Note: we might want to check if the day template belongs to a program owned by this user
        if (!dayTemplate.getWeekTemplate().getProgram().getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your template");
        }

        WorkoutSession session = new WorkoutSession();
        session.setUserId(userId);
        session.setDayTemplate(dayTemplate);
        session.setPerformedOn(request.performedOn());
        session.setWeekNumber(request.weekNumber());

        WorkoutSession saved = sessionRepository.save(session);
        return mapToResponse(saved);
    }

    public List<WorkoutSessionResponse> getSessions(UUID userId, UUID programId, int weekNumber) {
        return sessionRepository.findByUserIdAndProgramIdAndWeekNumber(userId, programId, weekNumber)
            .stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    public WorkoutSessionResponse getSession(UUID id, UUID userId) {
        WorkoutSession session = getSessionEntity(id, userId);
        return mapToResponse(session);
    }

    @Transactional
    public void deleteSession(UUID id, UUID userId) {
        WorkoutSession session = getSessionEntity(id, userId);
        sessionRepository.delete(session);
    }

    @Transactional
    public WorkoutSessionResponse updateNotes(UUID id, UUID userId, SessionNotesRequest request) {
        WorkoutSession session = getSessionEntity(id, userId);
        session.setNotes(request.notes());
        WorkoutSession saved = sessionRepository.save(session);
        return mapToResponse(saved);
    }

    @Transactional
    public WorkoutSessionResponse updateRating(UUID id, UUID userId, UUID dayExerciseId, SessionRatingRequest request) {
        WorkoutSession session = getSessionEntity(id, userId);
        DayExercise dayExercise = dayExerciseRepository.findById(dayExerciseId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Day exercise not found"));

        SessionExerciseRating rating = ratingRepository.findBySessionIdAndDayExerciseId(session.getId(), dayExerciseId)
            .orElse(new SessionExerciseRating());
        
        rating.setSession(session);
        rating.setDayExercise(dayExercise);
        rating.setRating(request.rating());

        ratingRepository.save(rating);
        return mapToResponse(session);
    }

    @Transactional
    public void completeSession(UUID id, UUID userId) {
        WorkoutSession session = getSessionEntity(id, userId);
        
        if (session.getCompletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session is already completed");
        }

        session.setCompletedAt(Instant.now());
        sessionRepository.save(session);

        // Fire analytics event
        List<WorkoutSet> sets = setRepository.findBySessionIdOrderByLoggedAtAsc(session.getId());
        
        Set<UUID> exerciseIds = sets.stream()
            .map(s -> s.getDayExercise().getExercise().getId())
            .collect(Collectors.toSet());
            
        Map<UUID, Map<String, java.math.BigDecimal>> targetsByExerciseId = targetRepository.findByExerciseIdIn(exerciseIds).stream()
            .collect(Collectors.groupingBy(
                t -> t.getExercise().getId(),
                Collectors.toMap(
                    t -> t.getBodyPart().name(),
                    t -> t.getTargetValue()
                )
            ));

        List<SessionCompletedEvent.SetData> setDatas = sets.stream()
            .map(s -> {
                UUID exId = s.getDayExercise().getExercise().getId();
                return new SessionCompletedEvent.SetData(
                    exId, 
                    s.getRepsCompleted(), 
                    s.getWeightKg(),
                    targetsByExerciseId.getOrDefault(exId, Map.of())
                );
            })
            .collect(Collectors.toList());

        SessionCompletedEvent event = new SessionCompletedEvent(
            session.getId(),
            session.getUserId(),
            session.getDayTemplate().getWeekTemplate().getProgram().getId(),
            session.getWeekNumber(),
            session.getPerformedOn(),
            setDatas
        );

        analyticsClient.notifySessionCompleted(event);
    }

    private WorkoutSession getSessionEntity(UUID id, UUID userId) {
        return sessionRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout session not found"));
    }

    private WorkoutSessionResponse mapToResponse(WorkoutSession session) {
        List<SessionRatingResponse> ratings = ratingRepository.findBySessionId(session.getId())
            .stream()
            .map(r -> new SessionRatingResponse(r.getId(), r.getDayExercise().getId(), r.getRating()))
            .collect(Collectors.toList());

        return new WorkoutSessionResponse(
            session.getId(),
            session.getDayTemplate().getId(),
            session.getDayTemplate().getName(),
            session.getPerformedOn(),
            session.getWeekNumber(),
            session.getCompletedAt(),
            session.getNotes(),
            ratings
        );
    }
}
