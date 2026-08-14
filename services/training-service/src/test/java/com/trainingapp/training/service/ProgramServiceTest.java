package com.trainingapp.training.service;

import com.trainingapp.training.domain.ProgramGoal;
import com.trainingapp.training.domain.ProgramRating;
import com.trainingapp.training.domain.TrainingProgram;
import com.trainingapp.training.dto.ProgramRequest;
import com.trainingapp.training.dto.ProgramResponse;
import com.trainingapp.training.exception.ResourceNotFoundException;
import com.trainingapp.training.repository.DayExerciseRepository;
import com.trainingapp.training.repository.DayTemplateRepository;
import com.trainingapp.training.repository.ProgramRatingRepository;
import com.trainingapp.training.repository.TrainingProgramRepository;
import com.trainingapp.training.repository.WeekTemplateRepository;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProgramServiceTest {

    @Mock private TrainingProgramRepository programRepository;
    @Mock private WeekTemplateRepository weekTemplateRepository;
    @Mock private DayTemplateRepository dayTemplateRepository;
    @Mock private DayExerciseRepository dayExerciseRepository;
    @Mock private ProgramRatingRepository programRatingRepository;

    @InjectMocks private ProgramService programService;

    private UUID userId;
    private UUID programId;
    private TrainingProgram sampleProgram;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        programId = UUID.randomUUID();
        sampleProgram = new TrainingProgram();
        sampleProgram.setId(programId);
        sampleProgram.setUserId(userId);
        sampleProgram.setName("PPL");
        sampleProgram.setDescription("Push Pull Legs Split");
        sampleProgram.setDurationWeeks(8);
    }

    @Test
    void findAll_returnsUserProgramsWithRatings() {
        when(programRepository.findByUserId(userId)).thenReturn(List.of(sampleProgram));
        when(programRatingRepository.getAverageRatingsForUserProgramsBatch(eq(userId), any())).thenReturn(List.of());

        List<ProgramResponse> result = programService.findAll(userId);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("PPL");
        assertThat(result.get(0).description()).isEqualTo("Push Pull Legs Split");
    }

    @Test
    void create_savesAndReturns() {
        when(programRepository.save(any())).thenReturn(sampleProgram);
        ProgramResponse result = programService.create(userId, new ProgramRequest("PPL", 8, null, false, 1, ProgramGoal.MAINTENANCE, false, "Push Pull Legs Split"));
        assertThat(result.name()).isEqualTo("PPL");
        assertThat(result.description()).isEqualTo("Push Pull Legs Split");
    }

    @Test
    void findById_notOwned_throwsNotFound() {
        when(programRepository.findById(programId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> programService.findById(userId, programId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_existingProgram_deletes() {
        when(programRepository.findByIdAndUserId(programId, userId)).thenReturn(Optional.of(sampleProgram));
        programService.delete(userId, programId);
        verify(programRepository).delete(sampleProgram);
    }

    @Test
    void rateProgram_savesRatingAndReturnsUpdated() {
        when(programRepository.findById(programId)).thenReturn(Optional.of(sampleProgram));
        List<Object[]> statsList = java.util.Collections.singletonList(new Object[]{8.5, 2L});
        when(programRatingRepository.getUserProgramRatingStats(eq(programId), eq(userId))).thenReturn(statsList);
        when(programRatingRepository.findFirstByProgramIdAndUserIdOrderByCreatedAtDesc(eq(programId), eq(userId)))
                .thenReturn(Optional.empty());

        ProgramResponse response = programService.rateProgram(userId, programId, 9);
        verify(programRatingRepository).save(any(ProgramRating.class));
        assertThat(response.averageRating()).isEqualTo(8.5);
        assertThat(response.ratingsCount()).isEqualTo(2);
    }
}
