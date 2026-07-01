package com.trainingapp.training.service;

import com.trainingapp.training.domain.DayExercise;
import com.trainingapp.training.domain.WorkoutSession;
import com.trainingapp.training.domain.WorkoutSet;
import com.trainingapp.training.dto.WorkoutSetRequest;
import com.trainingapp.training.dto.WorkoutSetResponse;
import com.trainingapp.training.repository.DayExerciseRepository;
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
    private final DayExerciseRepository dayExerciseRepository;

    public WorkoutSetService(WorkoutSetRepository setRepository,
                             WorkoutSessionRepository sessionRepository,
                             DayExerciseRepository dayExerciseRepository) {
        this.setRepository = setRepository;
        this.sessionRepository = sessionRepository;
        this.dayExerciseRepository = dayExerciseRepository;
    }

    @Transactional
    public WorkoutSetResponse logSet(UUID sessionId, UUID userId, WorkoutSetRequest request) {
        WorkoutSession session = sessionRepository.findByIdAndUserId(sessionId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout session not found"));

        if (session.getCompletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot log sets for a completed session");
        }

        DayExercise dayExercise = dayExerciseRepository.findById(request.dayExerciseId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Day exercise not found"));

        // Validate that the exercise belongs to the session's day template
        if (!dayExercise.getDayTemplate().getId().equals(session.getDayTemplate().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exercise does not belong to this day template");
        }

        WorkoutSet set = new WorkoutSet();
        set.setSession(session);
        set.setDayExercise(dayExercise);
        set.setSetNumber(request.setNumber());
        set.setRepsCompleted(request.repsCompleted());
        set.setRepsCompletedRight(request.repsCompletedRight());
        set.setWeightKg(request.weightKg());
        set.setDurationMinutes(request.durationMinutes());
        set.setIncline(request.incline());
        set.setResistance(request.resistance());

        WorkoutSet saved = setRepository.save(set);
        
        List<WorkoutSet> allSets = setRepository.findBySessionIdOrderByLoggedAtAsc(session.getId());
        double maxPerf = calculateMaxPerf(allSets, dayExercise.getId());
        return mapToResponse(saved, maxPerf);
    }

    public List<WorkoutSetResponse> getSetsForSession(UUID sessionId, UUID userId) {
        // Validate session ownership
        sessionRepository.findByIdAndUserId(sessionId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout session not found"));

        List<WorkoutSet> allSets = setRepository.findBySessionIdOrderByLoggedAtAsc(sessionId);
        return allSets.stream()
            .map(set -> {
                double maxPerf = calculateMaxPerf(allSets, set.getDayExercise().getId());
                return mapToResponse(set, maxPerf);
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

        DayExercise dayExercise = dayExerciseRepository.findById(request.dayExerciseId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Day exercise not found"));

        if (!dayExercise.getDayTemplate().getId().equals(set.getSession().getDayTemplate().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exercise does not belong to this day template");
        }

        set.setDayExercise(dayExercise);
        set.setSetNumber(request.setNumber());
        set.setRepsCompleted(request.repsCompleted());
        set.setRepsCompletedRight(request.repsCompletedRight());
        set.setWeightKg(request.weightKg());
        set.setDurationMinutes(request.durationMinutes());
        set.setIncline(request.incline());
        set.setResistance(request.resistance());

        WorkoutSet saved = setRepository.save(set);
        List<WorkoutSet> allSets = setRepository.findBySessionIdOrderByLoggedAtAsc(set.getSession().getId());
        double maxPerf = calculateMaxPerf(allSets, dayExercise.getId());
        return mapToResponse(saved, maxPerf);
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

    private double calculateMaxPerf(List<WorkoutSet> sets, UUID dayExerciseId) {
        double max = 0;
        for (WorkoutSet s : sets) {
            if (s.getDayExercise().getId().equals(dayExerciseId) && s.getWeightKg() != null && s.getRepsCompleted() != null) {
                int reps = s.getRepsCompleted() + (s.getRepsCompletedRight() != null ? s.getRepsCompletedRight() : 0);
                double perf = s.getWeightKg().doubleValue() * reps;
                if (perf > max) max = perf;
            }
        }
        return max;
    }

    private String calculatePerformanceStatus(WorkoutSet set, double maxPerf) {
        if (set.getWeightKg() == null || set.getRepsCompleted() == null || maxPerf == 0) return "GOOD";
        int reps = set.getRepsCompleted() + (set.getRepsCompletedRight() != null ? set.getRepsCompletedRight() : 0);
        double perf = set.getWeightKg().doubleValue() * reps;
        double ratio = perf / maxPerf;
        if (ratio < 0.75) return "CRITICAL";
        if (ratio < 0.90) return "WARNING";
        return "GOOD";
    }

    private WorkoutSetResponse mapToResponse(WorkoutSet set, double maxPerf) {
        return new WorkoutSetResponse(
            set.getId(),
            set.getSession().getId(),
            set.getDayExercise().getId(),
            set.getSetNumber(),
            set.getRepsCompleted(),
            set.getRepsCompletedRight(),
            set.getWeightKg(),
            set.getDurationMinutes(),
            set.getIncline(),
            set.getResistance(),
            set.getLoggedAt(),
            calculatePerformanceStatus(set, maxPerf)
        );
    }
}
