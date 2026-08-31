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
import com.trainingapp.training.dto.SessionExerciseUpdateRequest;
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
        Instant now = Instant.now();
        session.setStartedAt(now);
        session.setLastResumedAt(now);
        session.setPausedAt(null);
        session.setDurationSeconds(0);

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

        if (!sessionExercise.getSession().getId().equals(session.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your session exercise");
        }

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
    public WorkoutSessionResponse pauseSession(UUID id, UUID userId) {
        WorkoutSession session = getSessionEntity(id, userId);

        if (session.getCompletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session is already completed");
        }

        if (session.getPausedAt() != null) {
            return mapToResponse(session);
        }

        Instant now = Instant.now();
        Instant lastResumed = session.getLastResumedAt() != null ? session.getLastResumedAt() : session.getStartedAt();
        if (lastResumed != null && !now.isBefore(lastResumed)) {
            long segmentSeconds = java.time.Duration.between(lastResumed, now).getSeconds();
            session.setDurationSeconds(session.getDurationSeconds() + (int) segmentSeconds);
        }
        session.setPausedAt(now);
        WorkoutSession saved = sessionRepository.save(session);
        return mapToResponse(saved);
    }

    @Transactional
    public WorkoutSessionResponse resumeSession(UUID id, UUID userId) {
        WorkoutSession session = getSessionEntity(id, userId);

        if (session.getCompletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session is already completed");
        }

        if (session.getPausedAt() == null) {
            return mapToResponse(session);
        }

        Instant now = Instant.now();
        session.setLastResumedAt(now);
        session.setPausedAt(null);
        WorkoutSession saved = sessionRepository.save(session);
        return mapToResponse(saved);
    }

    @Transactional
    @org.springframework.cache.annotation.Caching(evict = {
        @org.springframework.cache.annotation.CacheEvict(value = "userExerciseProjections:v1", key = "#userId"),
        @org.springframework.cache.annotation.CacheEvict(value = "dashboardSummary:v1", allEntries = true)
    })
    public void completeSession(UUID id, UUID userId) {
        WorkoutSession session = getSessionEntity(id, userId);
        
        if (session.getCompletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session is already completed");
        }

        Instant now = Instant.now();
        if (session.getPausedAt() == null) {
            Instant lastResumed = session.getLastResumedAt() != null ? session.getLastResumedAt() : session.getStartedAt();
            if (lastResumed != null && !now.isBefore(lastResumed)) {
                long segmentSeconds = java.time.Duration.between(lastResumed, now).getSeconds();
                session.setDurationSeconds(session.getDurationSeconds() + (int) segmentSeconds);
            }
        }
        session.setCompletedAt(now);
        session.setPausedAt(null);
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
    @org.springframework.cache.annotation.Caching(evict = {
        @org.springframework.cache.annotation.CacheEvict(value = "userExerciseProjections:v1", key = "#userId"),
        @org.springframework.cache.annotation.CacheEvict(value = "dashboardSummary:v1", allEntries = true)
    })
    public void uncompleteSession(UUID id, UUID userId) {
        WorkoutSession session = getSessionEntity(id, userId);
        
        if (session.getCompletedAt() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session is not completed");
        }

        session.setCompletedAt(null);
        session.setLastResumedAt(Instant.now());
        session.setPausedAt(null);
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
        UUID currentDayTemplateId = session.getDayTemplate() != null ? session.getDayTemplate().getId() : null;

        List<ExerciseSuggestionResponse> suggestions = new java.util.ArrayList<>();
        for (SessionExercise se : sessionExercises) {
            int minReps = se.getReps() != null ? se.getReps() : 10;
            int maxReps = se.getRepsMax() != null ? se.getRepsMax() : minReps;
            int targetReps = (minReps + maxReps) / 2;

            java.util.Set<String> relevantBuckets = getOverlappingBuckets(minReps, maxReps);
            java.math.BigDecimal suggestedWeight = null;
            Integer suggestedReps = targetReps;
            double maxVolume = -1;

            // Find PR with the highest volume across all buckets that overlap with the exercise's rep range
            for (com.trainingapp.training.dto.ExercisePrProjection pr : prs) {
                boolean isRepsInRange = se.isAmrap() || (pr.getPrReps() != null && pr.getPrReps() >= minReps - 1 && pr.getPrReps() <= maxReps + 5);
                if (pr.getExerciseId().equals(se.getExercise().getId()) && relevantBuckets.contains(pr.getBucket()) && isRepsInRange) {
                    if (pr.getPrWeight() != null && pr.getPrReps() != null) {
                        double currentVolume = pr.getPrWeight().doubleValue() * pr.getPrReps();
                        if (suggestedWeight == null || currentVolume > maxVolume) {
                            suggestedWeight = pr.getPrWeight();
                            maxVolume = currentVolume;
                        }
                    }
                }
            }

            // If no PR and it's bodyweight, default to latest recorded body weight
            if (suggestedWeight == null && se.getExercise().isBodyweight() && latestBw.isPresent()) {
                suggestedWeight = latestBw.get().getWeightKg();
            }

            List<WorkoutSet> allHistorical = setRepository.findHistoricalSetsForExercise(se.getExercise().getId(), userId, session.getPerformedOn());
            boolean hadFatigueLastWeek = false;
            boolean suggestAddWeight = false;
            List<com.trainingapp.training.dto.PreviousSetSuggestion> previousSets = new java.util.ArrayList<>();
            boolean repRangeChanged = false;

            List<WorkoutSet> recentSets = findBestMatchingRecentSets(
                allHistorical, currentDayTemplateId, minReps, maxReps, se.isAmrap(), se.getExercise().isUnilateral()
            );

            if (!recentSets.isEmpty() && recentSets.get(0).getSessionExercise() != null) {
                Integer prevMin = recentSets.get(0).getSessionExercise().getReps();
                Integer prevMax = recentSets.get(0).getSessionExercise().getRepsMax();
                repRangeChanged = !java.util.Objects.equals(prevMin, se.getReps())
                               || !java.util.Objects.equals(prevMax, se.getRepsMax());
            }

            if (!recentSets.isEmpty()) {
                double maxPerf = 0;
                for (WorkoutSet s : recentSets) {
                    if (!isSetWithinRepRange(s, minReps, maxReps, se.isAmrap(), se.getExercise().isUnilateral())) {
                        continue;
                    }
                    if (s.getWeightKg() != null && s.getRepsCompleted() != null) {
                        int r = (se.getExercise().isUnilateral() && s.getRepsCompletedRight() != null)
                                ? Math.min(s.getRepsCompleted(), s.getRepsCompletedRight())
                                : s.getRepsCompleted();
                        double perf = s.getWeightKg().doubleValue() * r;
                        if (perf > maxPerf) maxPerf = perf;
                    }
                }

                int warnings = 0;
                int criticals = 0;
                int setsBelowMinReps = 0;
                int setsAboveMaxReps = 0;
                int validSetsCount = 0;

                for (WorkoutSet s : recentSets) {
                    if (!isSetWithinRepRange(s, minReps, maxReps, se.isAmrap(), se.getExercise().isUnilateral())) {
                        continue;
                    }
                    validSetsCount++;

                    if (s.getWeightKg() != null && s.getRepsCompleted() != null && maxPerf > 0) {
                        int r = (se.getExercise().isUnilateral() && s.getRepsCompletedRight() != null)
                                ? Math.min(s.getRepsCompleted(), s.getRepsCompletedRight())
                                : s.getRepsCompleted();
                        double perf = s.getWeightKg().doubleValue() * r;
                        double ratio = perf / maxPerf;
                        if (ratio < 0.75) criticals++;
                        else if (ratio < 0.90) warnings++;
                    }

                    if (s.getRepsCompleted() != null) {
                        int effectiveReps = (se.getExercise().isUnilateral() && s.getRepsCompletedRight() != null)
                                ? Math.min(s.getRepsCompleted(), s.getRepsCompletedRight())
                                : s.getRepsCompleted();
                        if (!se.isAmrap() && se.getReps() != null && effectiveReps < se.getReps()) {
                            setsBelowMinReps++;
                        }
                        if (se.getRepsMax() != null && effectiveReps >= se.getRepsMax()) {
                            setsAboveMaxReps++;
                        } else if (se.getRepsMax() == null && se.getReps() != null && effectiveReps > se.getReps()) {
                            setsAboveMaxReps++;
                        }
                    }
                }

                hadFatigueLastWeek = criticals >= 1 || warnings >= 2 || setsBelowMinReps > 0;
                int requiredSetsAboveMax = Math.min(2, validSetsCount > 0 ? validSetsCount : recentSets.size());
                suggestAddWeight = validSetsCount > 0 && setsAboveMaxReps >= requiredSetsAboveMax;

                for (WorkoutSet s : recentSets) {
                    if (isSetWithinRepRange(s, minReps, maxReps, se.isAmrap(), se.getExercise().isUnilateral())) {
                        previousSets.add(new com.trainingapp.training.dto.PreviousSetSuggestion(
                            s.getSetNumber(),
                            s.getWeightKg(),
                            s.getRepsCompleted(),
                            s.getRepsCompletedRight()
                        ));
                    }
                }
            }

            suggestions.add(new ExerciseSuggestionResponse(
                se.getId(),
                se.getExercise().getId(),
                suggestedWeight,
                suggestedReps,
                hadFatigueLastWeek && !repRangeChanged,
                suggestAddWeight,
                previousSets,
                repRangeChanged
            ));
        }
        return suggestions;
    }

    private List<WorkoutSet> findBestMatchingRecentSets(
            List<WorkoutSet> allHistorical,
            UUID currentDayTemplateId,
            int minReps,
            int maxReps,
            boolean isAmrap,
            boolean isUnilateral
    ) {
        if (allHistorical == null || allHistorical.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        // Group sets by session preserving descending date order
        java.util.Map<UUID, List<WorkoutSet>> sessionSetsMap = new java.util.LinkedHashMap<>();
        for (WorkoutSet hs : allHistorical) {
            if (hs.getSession() != null) {
                sessionSetsMap.computeIfAbsent(hs.getSession().getId(), k -> new java.util.ArrayList<>()).add(hs);
            }
        }

        // Priority 1: Same day template and compatible rep range
        if (currentDayTemplateId != null) {
            for (List<WorkoutSet> sessionSets : sessionSetsMap.values()) {
                WorkoutSession s = sessionSets.get(0).getSession();
                if (s.getDayTemplate() != null && currentDayTemplateId.equals(s.getDayTemplate().getId())) {
                    if (isSessionSetsCompatibleWithRepRange(sessionSets, minReps, maxReps, isAmrap, isUnilateral)) {
                        return sessionSets;
                    }
                }
            }
        }

        // Priority 2: Other session whose sets match the target rep range
        for (List<WorkoutSet> sessionSets : sessionSetsMap.values()) {
            if (isSessionSetsCompatibleWithRepRange(sessionSets, minReps, maxReps, isAmrap, isUnilateral)) {
                return sessionSets;
            }
        }

        return java.util.Collections.emptyList();
    }

    private boolean isSessionSetsCompatibleWithRepRange(
            List<WorkoutSet> sets,
            int minReps,
            int maxReps,
            boolean isAmrap,
            boolean isUnilateral
    ) {
        if (isAmrap) return true;
        if (sets == null || sets.isEmpty()) return false;

        for (WorkoutSet s : sets) {
            if (isSetWithinRepRange(s, minReps, maxReps, isAmrap, isUnilateral)) {
                return true;
            }
        }
        return false;
    }

    private boolean isSetWithinRepRange(
            WorkoutSet s,
            int minReps,
            int maxReps,
            boolean isAmrap,
            boolean isUnilateral
    ) {
        if (isAmrap) return true;
        if (s == null || s.getRepsCompleted() == null) return false;
        int effectiveReps = (isUnilateral && s.getRepsCompletedRight() != null)
                ? Math.min(s.getRepsCompleted(), s.getRepsCompletedRight())
                : s.getRepsCompleted();
        return effectiveReps >= minReps - 1 && effectiveReps <= maxReps + 5;
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

    /** Bucket boundary definitions: each entry is {lowerBound, upperBound}. */
    private static final int[][] BUCKET_RANGES = {
        {1, 5}, {6, 10}, {11, 15}, {16, 20}, {21, 25}, {26, 30}
    };
    private static final String[] BUCKET_LABELS = {
        "1-5", "6-10", "11-15", "16-20", "21-25", "26-30"
    };

    /**
     * Returns all rep-range bucket labels that overlap with [{@code minReps}, {@code maxReps}],
     * plus one bucket above {@code maxReps} to catch slight overruns (e.g. doing 21 reps
     * on a 10-20 goal). This ensures weight suggestions consider PRs from every
     * bucket the athlete might realistically hit within their programmed range.
     *
     * @param minReps lower bound of the exercise's rep range (inclusive)
     * @param maxReps upper bound of the exercise's rep range (inclusive)
     * @return set of bucket label strings (e.g. "6-10", "11-15", …)
     */
    private java.util.Set<String> getOverlappingBuckets(int minReps, int maxReps) {
        int extendedMax = maxReps + 5;
        java.util.Set<String> result = new java.util.HashSet<>();
        for (int i = 0; i < BUCKET_RANGES.length; i++) {
            if (BUCKET_RANGES[i][1] >= minReps && BUCKET_RANGES[i][0] <= extendedMax) {
                result.add(BUCKET_LABELS[i]);
            }
        }
        if (extendedMax >= 31) {
            result.add("31+");
        }
        return result;
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
        if (session.getDayTemplate() != null && session.getDayTemplate().getName() != null) {
            List<WorkoutSession> previous = sessionRepository.findPreviousSessionsWithNotesByDayName(
                    session.getUserId(), session.getId(), session.getDayTemplate().getName(), org.springframework.data.domain.PageRequest.of(0, 1));
            if (!previous.isEmpty()) {
                previousNotes = previous.get(0).getNotes();
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
            session.getLastResumedAt(),
            session.getPausedAt(),
            session.getDurationSeconds(),
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

        if (Boolean.TRUE.equals(request.saveToDayTemplate()) && session.getDayTemplate() != null) {
            DayTemplate dayTemplate = session.getDayTemplate();
            if (dayTemplate.getWeekTemplate() != null &&
                dayTemplate.getWeekTemplate().getProgram() != null &&
                dayTemplate.getWeekTemplate().getProgram().getUserId().equals(userId)) {

                boolean alreadyInDay = dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayTemplate.getId())
                    .stream().anyMatch(de -> de.getExercise().getId().equals(exercise.getId()));

                if (!alreadyInDay) {
                    int maxDayOrder = dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayTemplate.getId())
                        .stream().mapToInt(DayExercise::getSortOrder).max().orElse(0);

                    DayExercise dayExercise = new DayExercise();
                    dayExercise.setDayTemplate(dayTemplate);
                    dayExercise.setExercise(exercise);
                    dayExercise.setSets(request.sets() != null && request.sets() > 0 ? request.sets() : 3);
                    dayExercise.setReps(request.isAmrap() ? null : request.reps());
                    dayExercise.setRepsMax(request.isAmrap() ? null : request.repsMax());
                    dayExercise.setAmrap(request.isAmrap());
                    dayExercise.setSortOrder(maxDayOrder + 1);
                    dayExerciseRepository.save(dayExercise);
                }
            }
        }

        return mapSessionExerciseToResponse(saved);
    }

    @Transactional
    public WorkoutSessionResponse syncSessionExercises(UUID sessionId, UUID userId) {
        WorkoutSession session = getSessionEntity(sessionId, userId);

        if (session.getCompletedAt() != null || session.getDayTemplate() == null) {
            return mapToResponse(session);
        }

        DayTemplate dayTemplate = session.getDayTemplate();
        List<DayExercise> templateExercises = dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayTemplate.getId());
        List<SessionExercise> sessionExercises = sessionExerciseRepository.findBySessionIdOrderBySortOrderAsc(session.getId());

        Map<UUID, SessionExercise> sessionByExerciseId = sessionExercises.stream()
            .collect(Collectors.toMap(
                se -> se.getExercise().getId(),
                se -> se,
                (a, b) -> a
            ));

        Set<UUID> templateExerciseIds = templateExercises.stream()
            .map(de -> de.getExercise().getId())
            .collect(Collectors.toSet());

        int nextSortOrder = sessionExercises.stream()
            .mapToInt(SessionExercise::getSortOrder)
            .max()
            .orElse(-1) + 1;

        // 1. Update existing exercises & 2. Add new exercises
        for (DayExercise de : templateExercises) {
            SessionExercise se = sessionByExerciseId.get(de.getExercise().getId());
            if (se != null) {
                se.setSets(de.getSets());
                se.setReps(de.getReps());
                se.setRepsMax(de.getRepsMax());
                se.setAmrap(de.isAmrap());
                sessionExerciseRepository.save(se);
            } else {
                SessionExercise newSe = new SessionExercise();
                newSe.setSession(session);
                newSe.setExercise(de.getExercise());
                newSe.setSets(de.getSets());
                newSe.setReps(de.getReps());
                newSe.setRepsMax(de.getRepsMax());
                newSe.setSortOrder(nextSortOrder++);
                newSe.setAmrap(de.isAmrap());
                sessionExerciseRepository.save(newSe);
            }
        }

        // 3. Remove exercises that are no longer in template ONLY IF they have no logged sets
        List<WorkoutSet> allSessionSets = setRepository.findBySessionIdOrderByLoggedAtAsc(session.getId());
        Set<UUID> sessionExerciseIdsWithSets = allSessionSets.stream()
            .map(s -> s.getSessionExercise().getId())
            .collect(Collectors.toSet());

        for (SessionExercise se : sessionExercises) {
            if (!templateExerciseIds.contains(se.getExercise().getId())) {
                if (!sessionExerciseIdsWithSets.contains(se.getId())) {
                    ratingRepository.deleteBySessionIdAndSessionExerciseId(session.getId(), se.getId());
                    sessionExerciseRepository.delete(se);
                }
            }
        }

        return mapToResponse(session);
    }

    @Transactional
    public SessionExerciseResponse updateSessionExercise(UUID sessionId, UUID userId, UUID sessionExerciseId, SessionExerciseUpdateRequest request) {
        WorkoutSession session = getSessionEntity(sessionId, userId);
        if (session.getCompletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot modify a completed session");
        }

        SessionExercise se = sessionExerciseRepository.findById(sessionExerciseId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session exercise not found"));

        if (!se.getSession().getId().equals(session.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your session exercise");
        }

        if (request.sets() != null && request.sets() > 0) {
            se.setSets(request.sets());
        }
        se.setAmrap(request.isAmrap());
        if (request.isAmrap()) {
            se.setReps(null);
            se.setRepsMax(null);
        } else {
            if (request.reps() != null && request.reps() > 0) {
                se.setReps(request.reps());
            }
            se.setRepsMax(request.repsMax());
        }

        SessionExercise saved = sessionExerciseRepository.save(se);

        if (Boolean.TRUE.equals(request.saveToDayTemplate()) && session.getDayTemplate() != null) {
            DayTemplate dayTemplate = session.getDayTemplate();
            if (dayTemplate.getWeekTemplate() != null &&
                dayTemplate.getWeekTemplate().getProgram() != null &&
                dayTemplate.getWeekTemplate().getProgram().getUserId().equals(userId)) {

                List<DayExercise> dayExercises = dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayTemplate.getId());
                for (DayExercise de : dayExercises) {
                    if (de.getExercise().getId().equals(se.getExercise().getId())) {
                        if (request.sets() != null && request.sets() > 0) {
                            de.setSets(request.sets());
                        }
                        de.setAmrap(request.isAmrap());
                        if (request.isAmrap()) {
                            de.setReps(null);
                            de.setRepsMax(null);
                        } else {
                            if (request.reps() != null && request.reps() > 0) {
                                de.setReps(request.reps());
                            }
                            de.setRepsMax(request.repsMax());
                        }
                        dayExerciseRepository.save(de);
                        break;
                    }
                }
            }
        }

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

        // Clean up associated sets and ratings before deleting session exercise
        List<WorkoutSet> setsToDelete = setRepository.findBySessionIdOrderByLoggedAtAsc(session.getId())
            .stream()
            .filter(set -> set.getSessionExercise().getId().equals(se.getId()))
            .collect(Collectors.toList());
        setRepository.deleteAll(setsToDelete);

        ratingRepository.deleteBySessionIdAndSessionExerciseId(session.getId(), se.getId());
        sessionExerciseRepository.delete(se);
    }

    @Transactional
    public SessionExerciseResponse replaceSessionExercise(UUID sessionId, UUID userId, UUID sessionExerciseId, com.trainingapp.training.dto.SessionExerciseReplaceRequest request) {
        WorkoutSession session = getSessionEntity(sessionId, userId);
        if (session.getCompletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot modify a completed session");
        }

        SessionExercise se = sessionExerciseRepository.findById(sessionExerciseId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session exercise not found"));
        
        if (!se.getSession().getId().equals(session.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your session exercise");
        }

        Exercise oldExercise = se.getExercise();
        Exercise newExercise = exerciseRepository.findById(request.newExerciseId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "New exercise not found"));

        se.setExercise(newExercise);
        if (request.sets() != null && request.sets() > 0) {
            se.setSets(request.sets());
        }
        if (request.reps() != null && request.reps() > 0) {
            se.setReps(request.reps());
        }
        if (request.repsMax() != null) {
            se.setRepsMax(request.repsMax());
        }
        if (request.isAmrap() != null) {
            se.setAmrap(request.isAmrap());
        }

        // Delete any logged sets for the replaced exercise
        List<WorkoutSet> setsToDelete = setRepository.findBySessionIdOrderByLoggedAtAsc(session.getId())
            .stream()
            .filter(set -> set.getSessionExercise().getId().equals(se.getId()))
            .collect(Collectors.toList());
        
        setRepository.deleteAll(setsToDelete);

        SessionExercise saved = sessionExerciseRepository.save(se);

        if (Boolean.TRUE.equals(request.saveToDayTemplate()) && session.getDayTemplate() != null) {
            DayTemplate dayTemplate = session.getDayTemplate();
            if (dayTemplate.getWeekTemplate() != null &&
                dayTemplate.getWeekTemplate().getProgram() != null &&
                dayTemplate.getWeekTemplate().getProgram().getUserId().equals(userId)) {

                List<DayExercise> dayExercises = dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayTemplate.getId());
                for (DayExercise de : dayExercises) {
                    if (de.getExercise().getId().equals(oldExercise.getId())) {
                        de.setExercise(newExercise);
                        if (request.sets() != null && request.sets() > 0) {
                            de.setSets(request.sets());
                        }
                        if (request.isAmrap() != null) {
                            de.setAmrap(request.isAmrap());
                            de.setReps(request.isAmrap() ? null : request.reps());
                            de.setRepsMax(request.isAmrap() ? null : request.repsMax());
                        } else {
                            if (request.reps() != null && request.reps() > 0) {
                                de.setReps(request.reps());
                            }
                            if (request.repsMax() != null) {
                                de.setRepsMax(request.repsMax());
                            }
                        }
                        dayExerciseRepository.save(de);
                        break;
                    }
                }
            }
        }

        return mapSessionExerciseToResponse(saved);
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

    @Transactional
    public void resyncAllAnalytics() {
        List<WorkoutSession> completedSessions = sessionRepository.findByCompletedAtIsNotNull();
        for (WorkoutSession session : completedSessions) {
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

            List<com.trainingapp.training.dto.SessionUncompletedEvent.SetData> uncompletedSetDatas = sets.stream()
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

            com.trainingapp.training.dto.SessionUncompletedEvent uncompletedEvent = new com.trainingapp.training.dto.SessionUncompletedEvent(
                session.getId(),
                session.getUserId(),
                session.getDayTemplate().getWeekTemplate().getProgram().getId(),
                session.getWeekNumber(),
                session.getDayTemplate().getId(),
                session.getPerformedOn(),
                uncompletedSetDatas
            );

            SessionCompletedEvent completedEvent = new SessionCompletedEvent(
                session.getId(),
                session.getUserId(),
                session.getDayTemplate().getWeekTemplate().getProgram().getId(),
                session.getWeekNumber(),
                session.getDayTemplate().getId(),
                session.getPerformedOn(),
                setDatas
            );

            try {
                analyticsClient.notifySessionUncompletedSync(uncompletedEvent);
            } catch (Exception e) {
                // Ignore if it was not present
            }
            analyticsClient.notifySessionCompletedSync(completedEvent);
        }
    }
}
