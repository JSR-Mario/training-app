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
import com.trainingapp.training.repository.SessionExerciseRatingRepository;
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
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExerciseServiceTest {

    @Mock private ExerciseRepository exerciseRepository;
    @Mock private ExerciseBodyPartTargetRepository targetRepository;
    @Mock private SessionExerciseRatingRepository ratingRepository;
    @Mock private com.trainingapp.training.repository.WorkoutSetRepository setRepository;
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
        sampleExercise.setEquipmentBrand("Hammer Strength");
        sampleExercise.setUnilateral(false);
    }

    @Test
    void findAll_returnsUserExercises() {
        when(exerciseRepository.findByUserIdOrIsPublic(userId)).thenReturn(List.of(sampleExercise));
        when(ratingRepository.getAverageRatingsForExercises(any())).thenReturn(List.of());
        when(setRepository.findPersonalRecordsByUserId(userId)).thenReturn(List.of());
        List<ExerciseResponse> result = exerciseService.findAll(userId);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Bench Press");
        assertThat(result.get(0).equipmentBrand()).isEqualTo("Hammer Strength");
        assertThat(result.get(0).unilateral()).isFalse();
    }

    @Test
    void create_savesWithAllFields() {
        when(exerciseRepository.save(any())).thenReturn(sampleExercise);
        ExerciseResponse result = exerciseService.create(userId,
                new ExerciseRequest("Bench Press", "Hammer Strength", false, false, false, false));
        assertThat(result.name()).isEqualTo("Bench Press");
        assertThat(result.equipmentBrand()).isEqualTo("Hammer Strength");
        verify(exerciseRepository).save(any());
    }

    @Test
    void update_existingExercise_updatesAllFields() {
        when(exerciseRepository.findByIdAndUserIdOrIsPublic(exerciseId, userId)).thenReturn(Optional.of(sampleExercise));
        when(exerciseRepository.save(any())).thenReturn(sampleExercise);
        when(ratingRepository.getAverageRatingsForExercises(any())).thenReturn(List.of());
        when(setRepository.findPersonalRecordsByUserId(userId)).thenReturn(List.of());
        ExerciseResponse result = exerciseService.update(userId, exerciseId,
                new ExerciseRequest("Incline Press", "Rogue", true, false, false, false));
        assertThat(sampleExercise.getName()).isEqualTo("Incline Press");
        assertThat(sampleExercise.getEquipmentBrand()).isEqualTo("Rogue");
        assertThat(sampleExercise.isUnilateral()).isTrue();
    }

    @Test
    void update_notFound_throwsResourceNotFound() {
        when(exerciseRepository.findByIdAndUserIdOrIsPublic(exerciseId, userId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> exerciseService.update(userId, exerciseId,
                new ExerciseRequest("X", null, false, false, false, false)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_existingExercise_deletes() {
        when(exerciseRepository.findByIdAndUserIdOrIsPublic(exerciseId, userId)).thenReturn(Optional.of(sampleExercise));
        exerciseService.delete(userId, exerciseId);
        verify(exerciseRepository).delete(sampleExercise);
    }

    @Test
    void search_returnsMatchingExercises() {
        when(exerciseRepository.searchExercises(eq(userId), eq("bench"), any()))
                .thenReturn(List.of(sampleExercise));
        when(ratingRepository.getAverageRatingsForExercises(any())).thenReturn(List.of());
        when(setRepository.findPersonalRecordsByUserId(userId)).thenReturn(List.of());
        List<ExerciseResponse> result = exerciseService.search(userId, "bench");
        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Bench Press");
    }

    @Test
    void createTarget_savesAndReturns() {
        when(exerciseRepository.findByIdAndUserIdOrIsPublic(exerciseId, userId)).thenReturn(Optional.of(sampleExercise));
        ExerciseBodyPartTarget saved = new ExerciseBodyPartTarget();
        saved.setExercise(sampleExercise);
        saved.setBodyPart(BodyPart.MID_CHEST);
        saved.setTargetValue(BigDecimal.ONE);
        when(targetRepository.save(any())).thenReturn(saved);

        ExerciseTargetResponse result = exerciseService.createTarget(
                userId, exerciseId, new ExerciseTargetRequest(BodyPart.MID_CHEST, BigDecimal.ONE));
        assertThat(result.bodyPart()).isEqualTo(BodyPart.MID_CHEST);
    }

    @Test
    void deleteTarget_notFound_throwsResourceNotFound() {
        UUID targetId = UUID.randomUUID();
        when(targetRepository.findById(targetId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> exerciseService.deleteTarget(userId, targetId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
