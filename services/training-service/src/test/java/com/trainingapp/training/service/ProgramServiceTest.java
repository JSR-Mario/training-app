package com.trainingapp.training.service;

import com.trainingapp.training.domain.TrainingProgram;
import com.trainingapp.training.dto.ProgramRequest;
import com.trainingapp.training.dto.ProgramResponse;
import com.trainingapp.training.exception.ResourceNotFoundException;
import com.trainingapp.training.repository.TrainingProgramRepository;
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
class ProgramServiceTest {

    @Mock private TrainingProgramRepository programRepository;
    @InjectMocks private ProgramService programService;

    private UUID userId;
    private UUID programId;
    private TrainingProgram sampleProgram;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        programId = UUID.randomUUID();
        sampleProgram = new TrainingProgram();
        sampleProgram.setUserId(userId);
        sampleProgram.setName("PPL");
        sampleProgram.setDurationWeeks(8);
    }

    @Test
    void findAll_returnsUserPrograms() {
        when(programRepository.findByUserId(userId)).thenReturn(List.of(sampleProgram));
        List<ProgramResponse> result = programService.findAll(userId);
        assertThat(result).hasSize(1);
    }

    @Test
    void create_savesAndReturns() {
        when(programRepository.save(any())).thenReturn(sampleProgram);
        ProgramResponse result = programService.create(userId, new ProgramRequest("PPL", 8, null));
        assertThat(result.name()).isEqualTo("PPL");
    }

    @Test
    void findById_notOwned_throwsNotFound() {
        when(programRepository.findByIdAndUserId(programId, userId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> programService.findById(userId, programId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_existingProgram_deletes() {
        when(programRepository.findByIdAndUserId(programId, userId)).thenReturn(Optional.of(sampleProgram));
        programService.delete(userId, programId);
        verify(programRepository).delete(sampleProgram);
    }
}
