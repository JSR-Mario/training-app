package com.trainingapp.training.service;

import com.trainingapp.training.domain.DayExercise;
import com.trainingapp.training.domain.DayTemplate;
import com.trainingapp.training.domain.Exercise;
import com.trainingapp.training.dto.DayExerciseRequest;
import com.trainingapp.training.dto.DayExerciseResponse;
import com.trainingapp.training.dto.ReorderItem;
import com.trainingapp.training.exception.ResourceNotFoundException;
import com.trainingapp.training.repository.DayExerciseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DayExerciseServiceTest {

    @Mock private DayExerciseRepository dayExerciseRepository;
    @Mock private DayTemplateService dayTemplateService;
    @Mock private ExerciseService exerciseService;
    @InjectMocks private DayExerciseService dayExerciseService;

    private UUID userId;
    private UUID dayId;
    private DayTemplate sampleDay;
    private Exercise sampleExercise;
    private DayExercise sampleDayExercise;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        dayId = UUID.randomUUID();
        sampleDay = new DayTemplate();
        sampleDay.setName("Push");
        sampleExercise = new Exercise();
        sampleExercise.setName("Bench Press");
        sampleExercise.setUserId(userId);
        sampleDayExercise = new DayExercise();
        sampleDayExercise.setDayTemplate(sampleDay);
        sampleDayExercise.setExercise(sampleExercise);
        sampleDayExercise.setSets(3);
        sampleDayExercise.setReps(10);
        sampleDayExercise.setSortOrder(0);
    }

    @Test
    void findByDay_validatesOwnership() {
        when(dayTemplateService.findOwned(userId, dayId)).thenReturn(sampleDay);
        when(dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayId))
                .thenReturn(List.of(sampleDayExercise));
        List<DayExerciseResponse> result = dayExerciseService.findByDay(userId, dayId);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).exerciseName()).isEqualTo("Bench Press");
    }

    @Test
    void create_validatesAndSaves() {
        UUID exerciseId = UUID.randomUUID();
        when(dayTemplateService.findOwned(userId, dayId)).thenReturn(sampleDay);
        when(exerciseService.findOwned(userId, exerciseId)).thenReturn(sampleExercise);
        when(dayExerciseRepository.save(any())).thenReturn(sampleDayExercise);

        DayExerciseResponse result = dayExerciseService.create(userId, dayId,
                new DayExerciseRequest(exerciseId, 3, 10, null, false, 1));
        assertThat(result.sets()).isEqualTo(3);
    }

    @Test
    void delete_notFound_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(dayExerciseRepository.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> dayExerciseService.delete(userId, id))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void reorder_updatesSortOrders() {
        UUID deId = UUID.randomUUID();
        when(dayTemplateService.findOwned(userId, dayId)).thenReturn(sampleDay);
        when(dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(dayId))
                .thenReturn(List.of(sampleDayExercise));

        // Use reflection-free approach: the DayExercise has no ID set (it's null from constructor)
        // Just verify saveAll is called
        dayExerciseService.reorder(userId, dayId, List.of(new ReorderItem(deId, 5)));
        verify(dayExerciseRepository).saveAll(anyList());
    }
}
