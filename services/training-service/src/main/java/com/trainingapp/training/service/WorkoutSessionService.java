package com.trainingapp.training.service;

import com.trainingapp.training.client.AnalyticsNotificationClient;
import com.trainingapp.training.domain.DayTemplate;
import com.trainingapp.training.domain.WorkoutSession;
import com.trainingapp.training.domain.WorkoutSet;
import com.trainingapp.training.repository.BodyWeightRepository;
import com.trainingapp.training.domain.BodyWeightEntry;
import java.util.Optional;
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
import com.trainingapp.training.domain.SessionExercise;
import com.trainingapp.training.repository.SessionExerciseRepository;
import com.trainingapp.training.domain.SessionExerciseRating;
import com.trainingapp.training.domain.DayExercise;
import com.trainingapp.training.dto.SessionRatingRequest;
import com.trainingapp.training.dto.SessionRatingResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.trainingapp.training.dto.ExerciseSuggestionResponse;

import com.trainingapp.training.dto.SessionExerciseResponse;
import com.trainingapp.training.dto.SessionExerciseRequest;
import com.trainingapp.training.dto.SessionExerciseReorderRequest;
import com.trainingapp.training.repository.ExerciseRepository;
import com.trainingapp.training.domain.Exercise;

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
    private final ExperienceService experienceService;
    private final BodyWeightRepository bodyWeightRepository;
    private final SessionExerciseRepository sessionExerciseRepository;
    private final ExerciseRepository exerciseRepository;

    public WorkoutSessionService(WorkoutSessionRepository sessionRepository,
                                 DayTemplateRepository dayTemplateRepository,
                                 WorkoutSetRepository setRepository,
                                 ExerciseBodyPartTargetRepository targetRepository,
                                 AnalyticsNotificationClient analyticsClient,
                                 SessionExerciseRatingRepository ratingRepository,
                                 DayExerciseRepository dayExerciseRepository,
                                 ExperienceService experienceService,
                                 BodyWeightRepository bodyWeightRepository,
                                 SessionExerciseRepository sessionExerciseRepository,
                                 ExerciseRepository exerciseRepository) {
        this.sessionRepository = sessionRepository;
        this.dayTemplateRepository = dayTemplateRepository;
        this.setRepository = setRepository;
        this.targetRepository = targetRepository;
        this.analyticsClient = analyticsClient;
        this.ratingRepository = ratingRepository;
        this.dayExerciseRepository = dayExerciseRepository;
        this.experienceService = experienceService;
        this.bodyWeightRepository = bodyWeightRepository;
        this.sessionExerciseRepository = sessionExerciseRepository;
        this.exerciseRepository = exerciseRepository;
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
        session.setStartedAt(Instant.now());

        WorkoutSession saved = sessionRepository.save(session);

        // Copy DayExercises to SessionExercises
        dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayTemplate.getId()).forEach(de -> {
            SessionExercise se = new SessionExercise();
            se.setSession(saved);
            se.setExercise(de.getExercise());
            se.setSets(de.getSets());
            se.setReps(de.getReps());
            se.setRepsMax(de.getRepsMax());
            se.setSortOrder(de.getSortOrder());
            se.setAmrap(de.isAmrap());
            sessionExerciseRepository.save(se);
        });

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

    public WorkoutSessionResponse getActiveSession(UUID userId) {
        return sessionRepository.findByUserIdAndCompletedAtIsNull(userId).stream()
                .findFirst()
                .map(this::mapToResponse)
                .orElse(null);
    }

    @Transactional
    public void deleteSession(UUID id, UUID userId) {
        WorkoutSession session = getSessionEntity(id, userId);
        
        // If the session was completed, we must notify analytics to revert its data
        if (session.getCompletedAt() != null) {
            List<WorkoutSet> sets = setRepository.findBySessionIdOrderByLoggedAtAsc(session.getId());
            List<com.trainingapp.training.dto.SessionUncompletedEvent.SetData> setDatas = sets.stream()
                .map(s -> {
                    UUID exId = s.getSessionExercise().getExercise().getId();
                    return new com.trainingapp.training.dto.SessionUncompletedEvent.SetData(
                        exId, 
                        s.getRepsCompleted() != null ? s.getRepsCompleted() : 0,
                        s.getRepsCompletedRight(),
                        s.getWeightKg() != null ? s.getWeightKg() : java.math.BigDecimal.ZERO,
                        targetRepository.findByExerciseId(exId).stream()
                            .collect(Collectors.toMap(
                                t -> t.getBodyPart().name(),
                                t -> t.getTargetValue()
                            ))
                    );
                })
                .collect(Collectors.toList());

            analyticsClient.notifySessionUncompleted(new com.trainingapp.training.dto.SessionUncompletedEvent(
                session.getId(),
                session.getUserId(),
                session.getDayTemplate().getWeekTemplate().getProgram().getId(),
                session.getWeekNumber(),
                session.getDayTemplate().getId(),
                session.getPerformedOn(),
                setDatas
            ));
        }
        
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
    public WorkoutSessionResponse updateRating(UUID id, UUID userId, UUID sessionExerciseId, SessionRatingRequest request) {
        WorkoutSession session = getSessionEntity(id, userId);
        SessionExercise sessionExercise = sessionExerciseRepository.findById(sessionExerciseId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session exercise not found"));

        SessionExerciseRating rating = ratingRepository.findBySessionIdAndSessionExerciseId(session.getId(), sessionExerciseId)
            .orElse(new SessionExerciseRating());
        
        rating.setSession(session);
        rating.setSessionExercise(sessionExercise);
        rating.setRating(request.rating());

        ratingRepository.save(rating);
        return mapToResponse(session);
    }

    @Transactional
    public WorkoutSessionResponse deleteRating(UUID id, UUID userId, UUID sessionExerciseId) {
        WorkoutSession session = getSessionEntity(id, userId);
        ratingRepository.deleteBySessionIdAndSessionExerciseId(session.getId(), sessionExerciseId);
        
        // Return updated session response so frontend gets the fresh state
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
            .map(s -> s.getSessionExercise().getExercise().getId())
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
                UUID exId = s.getSessionExercise().getExercise().getId();
                return new SessionCompletedEvent.SetData(
                    exId, 
                    s.getRepsCompleted() != null ? s.getRepsCompleted() : 0,
                    s.getRepsCompletedRight(),
                    s.getWeightKg() != null ? s.getWeightKg() : java.math.BigDecimal.ZERO,
                    targetsByExerciseId.getOrDefault(exId, Map.of())
                );
            })
            .collect(Collectors.toList());

        SessionCompletedEvent event = new SessionCompletedEvent(
            session.getId(),
            session.getUserId(),
            session.getDayTemplate().getWeekTemplate().getProgram().getId(),
            session.getWeekNumber(),
            session.getDayTemplate().getId(),
            session.getPerformedOn(),
            setDatas
        );

        analyticsClient.notifySessionCompleted(event);

        // Update persisted XP — compute volume from the sets already in memory
        double sessionVolume = sets.stream()
            .filter(s -> s.getWeightKg() != null && s.getRepsCompleted() != null)
            .mapToDouble(s -> {
                int reps = s.getRepsCompleted() + (s.getRepsCompletedRight() != null ? s.getRepsCompletedRight() : 0);
                return s.getWeightKg().doubleValue() * reps;
            })
            .sum();
        experienceService.addVolume(userId, sessionVolume);
    }

    @Transactional
    public void uncompleteSession(UUID id, UUID userId) {
        WorkoutSession session = getSessionEntity(id, userId);
        
        if (session.getCompletedAt() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session is not completed");
        }

        session.setCompletedAt(null);
        sessionRepository.save(session);

        // Fire analytics event
        List<WorkoutSet> sets = setRepository.findBySessionIdOrderByLoggedAtAsc(session.getId());
        
        Set<UUID> exerciseIds = sets.stream()
            .map(s -> s.getSessionExercise().getExercise().getId())
            .collect(Collectors.toSet());
            
        Map<UUID, Map<String, java.math.BigDecimal>> targetsByExerciseId = targetRepository.findByExerciseIdIn(exerciseIds).stream()
            .collect(Collectors.groupingBy(
                t -> t.getExercise().getId(),
                Collectors.toMap(
                    t -> t.getBodyPart().name(),
                    t -> t.getTargetValue()
                )
            ));

        List<com.trainingapp.training.dto.SessionUncompletedEvent.SetData> setDatas = sets.stream()
            .map(s -> {
                UUID exId = s.getSessionExercise().getExercise().getId();
                return new com.trainingapp.training.dto.SessionUncompletedEvent.SetData(
                    exId, 
                    s.getRepsCompleted() != null ? s.getRepsCompleted() : 0,
                    s.getRepsCompletedRight(),
                    s.getWeightKg() != null ? s.getWeightKg() : java.math.BigDecimal.ZERO,
                    targetsByExerciseId.getOrDefault(exId, Map.of())
                );
            })
            .collect(Collectors.toList());

        com.trainingapp.training.dto.SessionUncompletedEvent event = new com.trainingapp.training.dto.SessionUncompletedEvent(
            session.getId(),
            session.getUserId(),
            session.getDayTemplate().getWeekTemplate().getProgram().getId(),
            session.getWeekNumber(),
            session.getDayTemplate().getId(),
            session.getPerformedOn(),
            setDatas
        );

        analyticsClient.notifySessionUncompleted(event);

        // Reverse the XP that was added when this session was completed
        double sessionVolume = sets.stream()
            .filter(s -> s.getWeightKg() != null && s.getRepsCompleted() != null)
            .mapToDouble(s -> {
                int reps = s.getRepsCompleted() + (s.getRepsCompletedRight() != null ? s.getRepsCompletedRight() : 0);
                return s.getWeightKg().doubleValue() * reps;
            })
            .sum();
        experienceService.subtractVolume(userId, sessionVolume);
    }

    public List<ExerciseSuggestionResponse> getExerciseSuggestions(UUID id, UUID userId) {
        WorkoutSession session = getSessionEntity(id, userId);
        List<SessionExercise> sessionExercises = sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(session.getId());
        List<com.trainingapp.training.dto.ExercisePrProjection> prs = setRepository.findPersonalRecordsByUserId(userId);
        Optional<BodyWeightEntry> latestBw = bodyWeightRepository.findFirstByUserIdOrderByDateDesc(userId);
        
        List<ExerciseSuggestionResponse> suggestions = new java.util.ArrayList<>();
        for (SessionExercise se : sessionExercises) {
            int targetReps = se.getReps() != null ? se.getReps() : 10;
            if (se.getReps() != null && se.getRepsMax() != null) {
                targetReps = (se.getReps() + se.getRepsMax()) / 2;
            }
            
            String targetBucket = getBucketForReps(targetReps);
            java.math.BigDecimal suggestedWeight = null;
            Integer suggestedReps = targetReps;
            
            // Find PR for this exercise and bucket
            for (com.trainingapp.training.dto.ExercisePrProjection pr : prs) {
                if (pr.getExerciseId().equals(se.getExercise().getId()) && targetBucket.equals(pr.getBucket())) {
                    suggestedWeight = pr.getPrWeight();
                    suggestedReps = pr.getPrReps();
                    break;
                }
            }
            
            // If no PR and it's bodyweight, default to latest recorded body weight
            if (suggestedWeight == null && se.getExercise().isBodyweight() && latestBw.isPresent()) {
                suggestedWeight = latestBw.get().getWeightKg();
            }
            
            List<WorkoutSet> allHistorical = setRepository.findHistoricalSetsForExercise(se.getExercise().getId(), userId, session.getPerformedOn());
            boolean hadFatigueLastWeek = false;
            List<com.trainingapp.training.dto.PreviousSetSuggestion> previousSets = new java.util.ArrayList<>();
            
            if (!allHistorical.isEmpty()) {
                UUID mostRecentSessionId = allHistorical.get(0).getSession().getId();
                List<WorkoutSet> recentSets = new java.util.ArrayList<>();
                for (WorkoutSet historicalSet : allHistorical) {
                    if (historicalSet.getSession().getId().equals(mostRecentSessionId)) {
                        recentSets.add(historicalSet);
                    }
                }
                
                double maxPerf = 0;
                for (WorkoutSet s : recentSets) {
                    if (s.getWeightKg() != null && s.getRepsCompleted() != null) {
                        int r = s.getRepsCompleted() + (s.getRepsCompletedRight() != null ? s.getRepsCompletedRight() : 0);
                        double perf = s.getWeightKg().doubleValue() * r;
                        if (perf > maxPerf) maxPerf = perf;
                    }
                }
                
                int warnings = 0;
                int criticals = 0;
                for (WorkoutSet s : recentSets) {
                    if (s.getWeightKg() != null && s.getRepsCompleted() != null && maxPerf > 0) {
                        int r = s.getRepsCompleted() + (s.getRepsCompletedRight() != null ? s.getRepsCompletedRight() : 0);
                        double perf = s.getWeightKg().doubleValue() * r;
                        double ratio = perf / maxPerf;
                        if (ratio < 0.75) criticals++;
                        else if (ratio < 0.90) warnings++;
                    }
                }
                
                hadFatigueLastWeek = criticals >= 1 || warnings >= 2;
                
                for (WorkoutSet s : recentSets) {
                    previousSets.add(new com.trainingapp.training.dto.PreviousSetSuggestion(
                        s.getSetNumber(),
                        s.getWeightKg(),
                        s.getRepsCompleted()
                    ));
                }
            }
            
            suggestions.add(new ExerciseSuggestionResponse(
                se.getId(),
                se.getExercise().getId(),
                suggestedWeight,
                suggestedReps,
                hadFatigueLastWeek,
                previousSets
            ));
        }
        return suggestions;
    }

    private String getBucketForReps(int reps) {
        if (reps >= 1 && reps <= 5) return "1-5";
        if (reps >= 6 && reps <= 10) return "6-10";
        if (reps >= 11 && reps <= 15) return "11-15";
        if (reps >= 16 && reps <= 20) return "16-20";
        if (reps >= 21 && reps <= 25) return "21-25";
        if (reps >= 26 && reps <= 30) return "26-30";
        return "31+";
    }

    private WorkoutSession getSessionEntity(UUID id, UUID userId) {
        return sessionRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout session not found"));
    }

    private WorkoutSessionResponse mapToResponse(WorkoutSession session) {
        List<SessionRatingResponse> ratings = ratingRepository.findBySessionId(session.getId())
            .stream()
            .map(r -> new SessionRatingResponse(r.getId(), r.getSessionExercise().getId(), r.getRating()))
            .collect(Collectors.toList());

        String previousNotes = null;
        if (session.getDayTemplate() != null) {
            Optional<WorkoutSession> previous = sessionRepository.findFirstByUserIdAndDayTemplateIdAndNotesIsNotNullOrderByPerformedOnDesc(
                    session.getUserId(), session.getDayTemplate().getId());
            if (previous.isPresent() && !previous.get().getId().equals(session.getId())) {
                previousNotes = previous.get().getNotes();
            }
        }

        return new WorkoutSessionResponse(
            session.getId(),
            session.getDayTemplate().getId(),
            session.getDayTemplate().getName(),
            session.getPerformedOn(),
            session.getWeekNumber(),
            session.getStartedAt(),
            session.getCompletedAt(),
            session.getNotes(),
            previousNotes,
            ratings
        );
    }

    public List<SessionExerciseResponse> getSessionExercises(UUID sessionId, UUID userId) {
        WorkoutSession session = getSessionEntity(sessionId, userId);
        return sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(session.getId())
            .stream()
            .map(this::mapSessionExerciseToResponse)
            .collect(Collectors.toList());
    }

    @Transactional
    public List<SessionExerciseResponse> reorderSessionExercises(UUID sessionId, UUID userId, List<SessionExerciseReorderRequest> requests) {
        WorkoutSession session = getSessionEntity(sessionId, userId);
        Map<UUID, SessionExercise> exerciseMap = sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(session.getId())
            .stream().collect(Collectors.toMap(SessionExercise::getId, e -> e));

        for (SessionExerciseReorderRequest req : requests) {
            SessionExercise se = exerciseMap.get(req.id());
            if (se != null) {
                se.setSortOrder(req.sortOrder());
            }
        }
        return sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(session.getId())
            .stream()
            .map(this::mapSessionExerciseToResponse)
            .collect(Collectors.toList());
    }

    @Transactional
    public SessionExerciseResponse addSessionExercise(UUID sessionId, UUID userId, SessionExerciseRequest request) {
        WorkoutSession session = getSessionEntity(sessionId, userId);
        Exercise exercise = exerciseRepository.findById(request.exerciseId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exercise not found"));

        int maxOrder = sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(session.getId())
            .stream().mapToInt(SessionExercise::getSortOrder).max().orElse(0);

        SessionExercise se = new SessionExercise();
        se.setSession(session);
        se.setExercise(exercise);
        se.setSets(request.sets());
        se.setReps(request.reps());
        se.setRepsMax(request.repsMax());
        se.setAmrap(request.isAmrap());
        se.setSortOrder(maxOrder + 1);

        SessionExercise saved = sessionExerciseRepository.save(se);
        return mapSessionExerciseToResponse(saved);
    }

    @Transactional
    public void removeSessionExercise(UUID sessionId, UUID userId, UUID sessionExerciseId) {
        WorkoutSession session = getSessionEntity(sessionId, userId);
        SessionExercise se = sessionExerciseRepository.findById(sessionExerciseId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session exercise not found"));
        
        if (!se.getSession().getId().equals(session.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your session exercise");
        }
        sessionExerciseRepository.delete(se);
    }

    private SessionExerciseResponse mapSessionExerciseToResponse(SessionExercise se) {
        // We need to map Exercise to ExerciseResponse using something. Let's create it manually or use ExerciseService mapToResponse if available.
        return new SessionExerciseResponse(
            se.getId(),
            se.getSession().getId(),
            new com.trainingapp.training.dto.ExerciseResponse(
                se.getExercise().getId(),
                se.getExercise().getName(),
                se.getExercise().getEquipmentBrand(),
                se.getExercise().isUnilateral(),
                se.getExercise().isBodyweight(),
                se.getExercise().getIsPublic(),
                se.getExercise().isSpinalLoading(),
                se.getExercise().getCreatedAt(),
                se.getExercise().getTargets().stream().map(t -> new com.trainingapp.training.dto.ExerciseTargetResponse(t.getId(), t.getBodyPart(), t.getTargetValue())).collect(Collectors.toList()),
                null,
                null
            ),
            se.getSets(),
            se.getReps(),
            se.getRepsMax(),
            se.getSortOrder(),
            se.isAmrap()
        );
    }
}
