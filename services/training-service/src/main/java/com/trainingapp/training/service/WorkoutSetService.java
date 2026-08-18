package com.trainingapp.training.service;

import com.trainingapp.training.domain.SessionExercise;
import com.trainingapp.training.domain.WorkoutSession;
import com.trainingapp.training.domain.WorkoutSet;
import com.trainingapp.training.dto.WorkoutSetRequest;
import com.trainingapp.training.dto.WorkoutSetResponse;
import com.trainingapp.training.repository.SessionExerciseRepository;
import com.trainingapp.training.repository.WorkoutSessionRepository;
import com.trainingapp.training.repository.WorkoutSetRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/** Service for managing workout sets within a session. */
@Service
@Transactional(readOnly = true)
public class WorkoutSetService {

    private final WorkoutSetRepository setRepository;
    private final WorkoutSessionRepository sessionRepository;
    private final SessionExerciseRepository sessionExerciseRepository;
    private final WorkoutSessionService workoutSessionService;

    public WorkoutSetService(WorkoutSetRepository setRepository,
                             WorkoutSessionRepository sessionRepository,
                             SessionExerciseRepository sessionExerciseRepository,
                             WorkoutSessionService workoutSessionService) {
        this.setRepository = setRepository;
        this.sessionRepository = sessionRepository;
        this.sessionExerciseRepository = sessionExerciseRepository;
        this.workoutSessionService = workoutSessionService;
    }

    @Transactional
    public WorkoutSetResponse logSet(UUID sessionId, UUID userId, WorkoutSetRequest request) {
        WorkoutSession session = sessionRepository.findByIdAndUserId(sessionId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout session not found"));

        if (session.getCompletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot log sets for a completed session");
        }

        SessionExercise sessionExercise = sessionExerciseRepository.findById(request.sessionExerciseId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session exercise not found"));

        if (!sessionExercise.getSession().getId().equals(session.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exercise does not belong to this session");
        }

        WorkoutSet set = new WorkoutSet();
        set.setSession(session);
        set.setSessionExercise(sessionExercise);
        set.setSetNumber(request.setNumber());
        set.setRepsCompleted(request.repsCompleted());
        set.setRepsCompletedRight(sessionExercise.getExercise().isUnilateral() ? request.repsCompletedRight() : null);
        set.setWeightKg(request.weightKg());

        WorkoutSet saved = setRepository.save(set);
        
        List<WorkoutSet> allSets = setRepository.findBySessionIdOrderByLoggedAtAsc(session.getId());
        double maxPerf = calculateMaxPerf(allSets, sessionExercise.getId());
        
        // Calculate if it's a PR by looking at past suggestions
        PrResult prResult = checkPr(session.getUserId(), saved);
        
        return mapToResponse(saved, maxPerf, prResult);
    }

    public List<WorkoutSetResponse> getSetsForSession(UUID sessionId, UUID userId) {
        // Validate session ownership
        sessionRepository.findByIdAndUserId(sessionId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout session not found"));

        List<WorkoutSet> allSets = setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId);
        return allSets.stream()
            .map(set -> {
                double maxPerf = calculateMaxPerf(allSets, set.getSessionExercise().getId());
                PrResult prResult = checkPr(userId, set);
                return mapToResponse(set, maxPerf, prResult);
            })
            .collect(Collectors.toList());
    }

    @Transactional
    public WorkoutSetResponse updateSet(UUID setId, UUID userId, WorkoutSetRequest request) {
        WorkoutSet set = setRepository.findByIdAndUserId(setId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout set not found"));

        if (set.getSession().getCompletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot update sets in a completed session");
        }

        SessionExercise sessionExercise = sessionExerciseRepository.findById(request.sessionExerciseId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session exercise not found"));

        if (!sessionExercise.getSession().getId().equals(set.getSession().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exercise does not belong to this session");
        }

        set.setSessionExercise(sessionExercise);
        set.setSetNumber(request.setNumber());
        set.setRepsCompleted(request.repsCompleted());
        set.setRepsCompletedRight(sessionExercise.getExercise().isUnilateral() ? request.repsCompletedRight() : null);
        set.setWeightKg(request.weightKg());
        WorkoutSet saved = setRepository.save(set);
        List<WorkoutSet> allSets = setRepository.findBySessionIdOrderByLoggedAtAsc(set.getSession().getId());
        double maxPerf = calculateMaxPerf(allSets, sessionExercise.getId());
        PrResult prResult = checkPr(userId, saved);
        return mapToResponse(saved, maxPerf, prResult);
    }

    @Transactional
    public void deleteSet(UUID setId, UUID userId) {
        WorkoutSet set = setRepository.findByIdAndUserId(setId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout set not found"));

        if (set.getSession().getCompletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete sets from a completed session");
        }

        setRepository.delete(set);
    }

    private double calculateMaxPerf(List<WorkoutSet> sets, UUID sessionExerciseId) {
        double max = 0;
        for (WorkoutSet s : sets) {
            if (s.getSessionExercise().getId().equals(sessionExerciseId) && s.getWeightKg() != null && s.getRepsCompleted() != null) {
                int reps = s.getRepsCompleted() + (s.getRepsCompletedRight() != null ? s.getRepsCompletedRight() : 0);
                double perf = s.getWeightKg().doubleValue() * reps;
                if (perf > max) {
                    max = perf;
                }
            }
        }
        return max;
    }

    private String calculatePerformanceStatus(WorkoutSet set, double maxPerf) {
        if (set.getRepsCompleted() == null) return "GOOD";

        int reps = set.getRepsCompleted() + (set.getRepsCompletedRight() != null ? set.getRepsCompletedRight() : 0);

        Double ratio = null;
        if (set.getWeightKg() != null && maxPerf > 0) {
            double perf = set.getWeightKg().doubleValue() * reps;
            ratio = perf / maxPerf;
        }

        if (ratio != null && ratio < 0.70) {
            return "CRITICAL";
        }

        if (ratio != null && ratio < 0.80) {
            return "WARNING";
        }

        SessionExercise se = set.getSessionExercise();
        if (se != null && !se.isAmrap() && se.getReps() != null) {
            boolean isUnilateral = se.getExercise() != null && se.getExercise().isUnilateral();
            int effectiveReps = (isUnilateral && set.getRepsCompletedRight() != null)
                    ? Math.min(set.getRepsCompleted(), set.getRepsCompletedRight())
                    : set.getRepsCompleted();
            if (effectiveReps < se.getReps()) {
                return "WARNING";
            }
        }

        return "GOOD";
    }

    private record PrResult(boolean isNewPr, java.math.BigDecimal previousWeight, Integer previousReps) {}

    private PrResult checkPr(UUID userId, WorkoutSet set) {
        if (set.getWeightKg() == null || set.getRepsCompleted() == null) return new PrResult(false, null, null);
        
        boolean isUnilateral = set.getSessionExercise().getExercise().isUnilateral();
        int effectiveReps = isUnilateral 
            ? (set.getRepsCompletedRight() != null ? Math.min(set.getRepsCompleted(), set.getRepsCompletedRight()) : set.getRepsCompleted())
            : set.getRepsCompleted();
            
        String bucket = getBucketForReps(effectiveReps);
        List<com.trainingapp.training.dto.ExercisePrProjection> prs = setRepository.findPersonalRecordsByUserIdExcludingSession(userId, set.getSession().getId());
        
        for (com.trainingapp.training.dto.ExercisePrProjection pr : prs) {
            if (pr.getExerciseId().equals(set.getSessionExercise().getExercise().getId()) && pr.getBucket().equals(bucket)) {
                int weightComp = set.getWeightKg().compareTo(pr.getPrWeight());
                if (weightComp > 0) {
                    return new PrResult(true, pr.getPrWeight(), pr.getPrReps());
                } else if (weightComp == 0) {
                    return new PrResult(pr.getPrReps() != null && effectiveReps > pr.getPrReps(), pr.getPrWeight(), pr.getPrReps());
                } else {
                    return new PrResult(false, pr.getPrWeight(), pr.getPrReps());
                }
            }
        }
        // If there was no PR in this bucket before, this is a new PR
        return new PrResult(true, null, null);
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

    private WorkoutSetResponse mapToResponse(WorkoutSet set, double maxPerf, PrResult prResult) {
        return new WorkoutSetResponse(
            set.getId(),
            set.getSession().getId(),
            set.getSessionExercise().getId(),
            set.getSetNumber(),
            set.getRepsCompleted(),
            set.getRepsCompletedRight(),
            set.getWeightKg(),
            set.getLoggedAt(),
            calculatePerformanceStatus(set, maxPerf),
            prResult.isNewPr(),
            prResult.previousWeight(),
            prResult.previousReps()
        );
    }
}
