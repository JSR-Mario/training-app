package com.trainingapp.training.service;

import com.trainingapp.training.domain.Exercise;
import com.trainingapp.training.domain.BodyPart;
import com.trainingapp.training.domain.ExerciseBodyPartTarget;
import com.trainingapp.training.dto.ExerciseRequest;
import com.trainingapp.training.dto.ExerciseResponse;
import com.trainingapp.training.dto.ExerciseTargetRequest;
import com.trainingapp.training.dto.ExerciseTargetResponse;
import com.trainingapp.training.exception.ResourceNotFoundException;
import com.trainingapp.training.repository.ExerciseBodyPartTargetRepository;
import com.trainingapp.training.repository.ExerciseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExerciseServiceTest {

    @Mock private ExerciseRepository exerciseRepository;
    @Mock private ExerciseBodyPartTargetRepository targetRepository;
    @InjectMocks private ExerciseService exerciseService;

    private UUID userId;
    private UUID exerciseId;
    private Exercise sampleExercise;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        exerciseId = UUID.randomUUID();
        sampleExercise = new Exercise();
        sampleExercise.setUserId(userId);
        sampleExercise.setName("Bench Press");
    }

    @Test
    void findAll_returnsUserExercises() {
        when(exerciseRepository.findByUserId(userId)).thenReturn(List.of(sampleExercise));
        List<ExerciseResponse> result = exerciseService.findAll(userId);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Bench Press");
    }

    @Test
    void create_savesAndReturns() {
        when(exerciseRepository.save(any())).thenReturn(sampleExercise);
        ExerciseResponse result = exerciseService.create(userId, new ExerciseRequest("Bench Press"));
        assertThat(result.name()).isEqualTo("Bench Press");
        verify(exerciseRepository).save(any());
    }

    @Test
    void update_existingExercise_updatesName() {
        when(exerciseRepository.findByIdAndUserId(exerciseId, userId)).thenReturn(Optional.of(sampleExercise));
        when(exerciseRepository.save(any())).thenReturn(sampleExercise);
        exerciseService.update(userId, exerciseId, new ExerciseRequest("Incline Press"));
        assertThat(sampleExercise.getName()).isEqualTo("Incline Press");
    }

    @Test
    void update_notFound_throwsResourceNotFound() {
        when(exerciseRepository.findByIdAndUserId(exerciseId, userId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> exerciseService.update(userId, exerciseId, new ExerciseRequest("X")))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_existingExercise_deletes() {
        when(exerciseRepository.findByIdAndUserId(exerciseId, userId)).thenReturn(Optional.of(sampleExercise));
        exerciseService.delete(userId, exerciseId);
        verify(exerciseRepository).delete(sampleExercise);
    }

    @Test
    void createTarget_savesAndReturns() {
        when(exerciseRepository.findByIdAndUserId(exerciseId, userId)).thenReturn(Optional.of(sampleExercise));
        ExerciseBodyPartTarget saved = new ExerciseBodyPartTarget();
        saved.setExercise(sampleExercise);
        saved.setBodyPart(BodyPart.CHEST);
        saved.setTargetValue(BigDecimal.ONE);
        when(targetRepository.save(any())).thenReturn(saved);

        ExerciseTargetResponse result = exerciseService.createTarget(
                userId, exerciseId, new ExerciseTargetRequest(BodyPart.CHEST, BigDecimal.ONE));
        assertThat(result.bodyPart()).isEqualTo(BodyPart.CHEST);
    }

    @Test
    void deleteTarget_notFound_throwsResourceNotFound() {
        UUID targetId = UUID.randomUUID();
        when(targetRepository.findById(targetId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> exerciseService.deleteTarget(userId, targetId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
