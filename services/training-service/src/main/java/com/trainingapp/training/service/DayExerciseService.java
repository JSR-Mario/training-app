package com.trainingapp.training.service;

import com.trainingapp.training.domain.DayExercise;
import com.trainingapp.training.domain.DayTemplate;
import com.trainingapp.training.domain.Exercise;
import com.trainingapp.training.dto.DayExerciseRequest;
import com.trainingapp.training.dto.DayExerciseResponse;
import com.trainingapp.training.dto.ReorderItem;
import com.trainingapp.training.exception.ResourceNotFoundException;
import com.trainingapp.training.repository.DayExerciseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Business logic for exercises assigned to day templates, including
 * batch reordering of sort orders.
 */
@Service
public class DayExerciseService {

    private final DayExerciseRepository dayExerciseRepository;
    private final DayTemplateService dayTemplateService;
    private final ExerciseService exerciseService;

    public DayExerciseService(DayExerciseRepository dayExerciseRepository,
                              DayTemplateService dayTemplateService,
                              ExerciseService exerciseService) {
        this.dayExerciseRepository = dayExerciseRepository;
        this.dayTemplateService = dayTemplateService;
        this.exerciseService = exerciseService;
    }

    @Transactional(readOnly = true)
    public List<DayExerciseResponse> findByDay(UUID userId, UUID dayId) {
        dayTemplateService.findOwned(userId, dayId);
        return dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public DayExerciseResponse create(UUID userId, UUID dayId, DayExerciseRequest request) {
        DayTemplate day = dayTemplateService.findOwned(userId, dayId);
        
        boolean alreadyExists = dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayId).stream()
                .anyMatch(de -> de.getExercise().getId().equals(request.exerciseId()));
        if (alreadyExists) {
            throw new IllegalArgumentException("This exercise is already added to the day.");
        }

        Exercise exercise = exerciseService.findOwned(userId, request.exerciseId());

        DayExercise dayExercise = new DayExercise();
        dayExercise.setDayTemplate(day);
        dayExercise.setExercise(exercise);
        dayExercise.setSets(request.sets());
        dayExercise.setReps(request.reps());
        dayExercise.setRepsMax(request.repsMax());
        dayExercise.setSortOrder(request.sortOrder());
        return toResponse(dayExerciseRepository.save(dayExercise));
    }

    @Transactional
    public DayExerciseResponse update(UUID userId, UUID dayExerciseId, DayExerciseRequest request) {
        DayExercise dayExercise = findOwnedDayExercise(userId, dayExerciseId);
        Exercise exercise = exerciseService.findOwned(userId, request.exerciseId());

        dayExercise.setExercise(exercise);
        dayExercise.setSets(request.sets());
        dayExercise.setReps(request.reps());
        dayExercise.setRepsMax(request.repsMax());
        dayExercise.setSortOrder(request.sortOrder());
        return toResponse(dayExerciseRepository.save(dayExercise));
    }

    @Transactional
    public void delete(UUID userId, UUID dayExerciseId) {
        DayExercise dayExercise = findOwnedDayExercise(userId, dayExerciseId);
        dayExerciseRepository.delete(dayExercise);
    }

    /**
     * Batch-updates the sort order of exercises within a day template.
     * Each item in the list contains a day-exercise ID and its new sort order.
     */
    @Transactional
    public void reorder(UUID userId, UUID dayId, List<ReorderItem> items) {
        dayTemplateService.findOwned(userId, dayId);
        List<DayExercise> dayExercises = dayExerciseRepository
                .findByDayTemplateIdOrderBySortOrderAsc(dayId);

        Map<UUID, Integer> newOrders = items.stream()
                .collect(Collectors.toMap(ReorderItem::id, ReorderItem::sortOrder));

        for (DayExercise de : dayExercises) {
            Integer newOrder = newOrders.get(de.getId());
            if (newOrder != null) {
                de.setSortOrder(newOrder);
            }
        }
        dayExerciseRepository.saveAll(dayExercises);
    }

    private DayExercise findOwnedDayExercise(UUID userId, UUID dayExerciseId) {
        DayExercise dayExercise = dayExerciseRepository.findById(dayExerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Day exercise not found."));
        dayTemplateService.findOwned(userId, dayExercise.getDayTemplate().getId());
        return dayExercise;
    }

    private DayExerciseResponse toResponse(DayExercise de) {
        return new DayExerciseResponse(
                de.getId(),
                de.getExercise().getId(),
                de.getExercise().getName(),
                de.getSets(),
                de.getReps(),
                de.getRepsMax(),
                de.getSortOrder(),
                de.getExercise().isUnilateral()
        );
    }
}
