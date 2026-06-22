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

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.access.AccessDeniedException;

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

    /** Returns all exercises belonging to the given user or public exercises. */
    @Transactional(readOnly = true)
    public List<ExerciseResponse> findAll(UUID userId) {
        return exerciseRepository.findByUserIdOrIsPublic(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    /** Returns up to 3 exercises matching the query for autocomplete. */
    @Transactional(readOnly = true)
    public List<ExerciseResponse> search(UUID userId, String query) {
        return exerciseRepository.searchExercises(userId, query, org.springframework.data.domain.PageRequest.of(0, 3))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /** Creates a new exercise. Only admins can create public exercises. */
    @Transactional
    public ExerciseResponse create(UUID userId, ExerciseRequest request) {
        Exercise exercise = new Exercise();
        exercise.setUserId(userId);
        exercise.setName(request.name());
        exercise.setEquipmentBrand(request.equipmentBrand());
        exercise.setUnilateral(request.unilateral());
        
        if (request.isPublic()) {
            if (!isAdmin()) {
                throw new AccessDeniedException("Only administrators can create public exercises.");
            }
            exercise.setIsPublic(true);
        } else {
            exercise.setIsPublic(false);
        }
        
        return toResponse(exerciseRepository.save(exercise));
    }

    /** Updates exercise fields. Validates ownership and public roles. */
    @Transactional
    public ExerciseResponse update(UUID userId, UUID exerciseId, ExerciseRequest request) {
        Exercise exercise = findOwnedOrPublicAdmin(userId, exerciseId);
        exercise.setName(request.name());
        exercise.setEquipmentBrand(request.equipmentBrand());
        exercise.setUnilateral(request.unilateral());
        
        if (request.isPublic() != exercise.getIsPublic()) {
            if (!isAdmin()) {
                throw new AccessDeniedException("Only administrators can change the public visibility of an exercise.");
            }
            exercise.setIsPublic(request.isPublic());
        }
        
        return toResponse(exerciseRepository.save(exercise));
    }

    /** Deletes the exercise. Validates ownership and public roles. Cascades to targets. */
    @Transactional
    public void delete(UUID userId, UUID exerciseId) {
        Exercise exercise = findOwnedOrPublicAdmin(userId, exerciseId);
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

    /** Creates a new body-part target for the given exercise. Validates ownership and public roles. */
    @Transactional
    public ExerciseTargetResponse createTarget(UUID userId, UUID exerciseId, ExerciseTargetRequest request) {
        Exercise exercise = findOwnedOrPublicAdmin(userId, exerciseId);
        ExerciseBodyPartTarget target = new ExerciseBodyPartTarget();
        target.setExercise(exercise);
        target.setBodyPart(request.bodyPart());
        target.setTargetValue(request.targetValue());
        return toTargetResponse(targetRepository.save(target));
    }

    /** Updates an existing body-part target. Validates exercise ownership and public roles. */
    @Transactional
    public ExerciseTargetResponse updateTarget(UUID userId, UUID targetId, ExerciseTargetRequest request) {
        ExerciseBodyPartTarget target = targetRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise target not found."));
        findOwnedOrPublicAdmin(userId, target.getExercise().getId());
        target.setBodyPart(request.bodyPart());
        target.setTargetValue(request.targetValue());
        return toTargetResponse(targetRepository.save(target));
    }

    /** Deletes a body-part target. Validates exercise ownership. */
    @Transactional
    public void deleteTarget(UUID userId, UUID targetId) {
        ExerciseBodyPartTarget target = targetRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise target not found."));
        findOwnedOrPublicAdmin(userId, target.getExercise().getId());
        targetRepository.delete(target);
    }

    /**
     * Finds an exercise by ID and validates it belongs to the user.
     * Package-private so other services can reuse it.
     */
    Exercise findOwned(UUID userId, UUID exerciseId) {
        return exerciseRepository.findByIdAndUserIdOrIsPublic(exerciseId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found."));
    }

    /**
     * Finds an exercise by ID. If it is public, the user must be an admin to proceed.
     * If it is private, the user must be the owner.
     */
    private Exercise findOwnedOrPublicAdmin(UUID userId, UUID exerciseId) {
        Exercise exercise = exerciseRepository.findByIdAndUserIdOrIsPublic(exerciseId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise not found."));
        if (exercise.getIsPublic() && !isAdmin()) {
            throw new AccessDeniedException("Only administrators can modify public exercises.");
        }
        if (!exercise.getIsPublic() && !exercise.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to modify this exercise.");
        }
        return exercise;
    }

    private boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) return false;
        return authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private ExerciseResponse toResponse(Exercise e) {
        List<ExerciseTargetResponse> targetResponses = e.getTargets().stream()
                .map(this::toTargetResponse)
                .toList();
        return new ExerciseResponse(e.getId(), e.getName(), e.getEquipmentBrand(), e.isUnilateral(), e.getIsPublic(), e.getCreatedAt(), targetResponses);
    }

    private ExerciseTargetResponse toTargetResponse(ExerciseBodyPartTarget t) {
        return new ExerciseTargetResponse(t.getId(), t.getBodyPart(), t.getTargetValue());
    }
}
