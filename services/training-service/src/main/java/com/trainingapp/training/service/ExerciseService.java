package com.trainingapp.training.service;

import com.trainingapp.training.domain.Exercise;
import com.trainingapp.training.domain.ExerciseBodyPartTarget;
import com.trainingapp.training.dto.ExerciseRequest;
import com.trainingapp.training.dto.ExerciseResponse;
import com.trainingapp.training.dto.ExerciseTargetRequest;
import com.trainingapp.training.dto.ExerciseTargetResponse;
import com.trainingapp.training.exception.ResourceNotFoundException;
import com.trainingapp.training.repository.ExerciseBodyPartTargetRepository;
import com.trainingapp.training.repository.ExerciseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Business logic for the exercise catalog and body-part targets.
 * All reads and writes are scoped to the authenticated user's ID.
 */
@Service
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;
    private final ExerciseBodyPartTargetRepository targetRepository;

    public ExerciseService(ExerciseRepository exerciseRepository,
                           ExerciseBodyPartTargetRepository targetRepository) {
        this.exerciseRepository = exerciseRepository;
        this.targetRepository = targetRepository;
    }

    /** Returns all exercises belonging to the given user. */
    @Transactional(readOnly = true)
    public List<ExerciseResponse> findAll(UUID userId) {
        return exerciseRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    /** Returns up to 3 exercises matching the query for autocomplete. */
    @Transactional(readOnly = true)
    public List<ExerciseResponse> search(UUID userId, String query) {
        return exerciseRepository.findTop3ByUserIdAndNameContainingIgnoreCase(userId, query)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /** Creates a new exercise for the given user. */
    @Transactional
    public ExerciseResponse create(UUID userId, ExerciseRequest request) {
        Exercise exercise = new Exercise();
        exercise.setUserId(userId);
        exercise.setName(request.name());
        exercise.setEquipmentBrand(request.equipmentBrand());
        exercise.setUnilateral(request.unilateral());
        return toResponse(exerciseRepository.save(exercise));
    }

    /** Updates exercise fields. Validates ownership. */
    @Transactional
    public ExerciseResponse update(UUID userId, UUID exerciseId, ExerciseRequest request) {
        Exercise exercise = findOwned(userId, exerciseId);
        exercise.setName(request.name());
        exercise.setEquipmentBrand(request.equipmentBrand());
        exercise.setUnilateral(request.unilateral());
        return toResponse(exerciseRepository.save(exercise));
    }

    /** Deletes the exercise. Validates ownership. Cascades to targets. */
    @Transactional
    public void delete(UUID userId, UUID exerciseId) {
        Exercise exercise = findOwned(userId, exerciseId);
        exerciseRepository.delete(exercise);
    }

    /** Returns all body-part targets for the given exercise. Validates ownership. */
    @Transactional(readOnly = true)
    public List<ExerciseTargetResponse> findTargets(UUID userId, UUID exerciseId) {
        findOwned(userId, exerciseId);
        return targetRepository.findByExerciseId(exerciseId).stream()
                .map(this::toTargetResponse)
                .toList();
    }

    /** Creates a new body-part target for the given exercise. Validates ownership. */
    @Transactional
    public ExerciseTargetResponse createTarget(UUID userId, UUID exerciseId, ExerciseTargetRequest request) {
        Exercise exercise = findOwned(userId, exerciseId);
        ExerciseBodyPartTarget target = new ExerciseBodyPartTarget();
        target.setExercise(exercise);
        target.setBodyPart(request.bodyPart());
        target.setTargetValue(request.targetValue());
        return toTargetResponse(targetRepository.save(target));
    }

    /** Updates an existing body-part target. Validates exercise ownership. */
    @Transactional
    public ExerciseTargetResponse updateTarget(UUID userId, UUID targetId, ExerciseTargetRequest request) {
        ExerciseBodyPartTarget target = targetRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise target not found."));
        findOwned(userId, target.getExercise().getId());
        target.setBodyPart(request.bodyPart());
        target.setTargetValue(request.targetValue());
        return toTargetResponse(targetRepository.save(target));
    }

    /** Deletes a body-part target. Validates exercise ownership. */
    @Transactional
    public void deleteTarget(UUID userId, UUID targetId) {
        ExerciseBodyPartTarget target = targetRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise target not found."));
        findOwned(userId, target.getExercise().getId());
        targetRepository.delete(target);
    }

    /**
     * Finds an exercise by ID and validates it belongs to the user.
     * Package-private so other services can reuse it.
     */
    Exercise findOwned(UUID userId, UUID exerciseId) {
        return exerciseRepository.findByIdAndUserId(exerciseId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found."));
    }

    private ExerciseResponse toResponse(Exercise e) {
        List<ExerciseTargetResponse> targetResponses = e.getTargets().stream()
                .map(this::toTargetResponse)
                .toList();
        return new ExerciseResponse(e.getId(), e.getName(), e.getEquipmentBrand(), e.isUnilateral(), e.getCreatedAt(), targetResponses);
    }

    private ExerciseTargetResponse toTargetResponse(ExerciseBodyPartTarget t) {
        return new ExerciseTargetResponse(t.getId(), t.getBodyPart(), t.getTargetValue());
    }
}
