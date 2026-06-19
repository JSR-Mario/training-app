package com.trainingapp.training.service;

import com.trainingapp.training.domain.TrainingProgram;
import com.trainingapp.training.domain.WeekTemplate;
import com.trainingapp.training.dto.WeekTemplateRequest;
import com.trainingapp.training.dto.WeekTemplateResponse;
import com.trainingapp.training.exception.ResourceNotFoundException;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WeekTemplateServiceTest {

    @Mock private WeekTemplateRepository weekRepository;
    @Mock private ProgramService programService;
    @InjectMocks private WeekTemplateService weekService;

    private UUID userId;
    private UUID programId;
    private UUID weekId;
    private TrainingProgram sampleProgram;
    private WeekTemplate sampleWeek;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        programId = UUID.randomUUID();
        weekId = UUID.randomUUID();
        sampleProgram = new TrainingProgram();
        sampleProgram.setUserId(userId);
        sampleProgram.setName("PPL");
        sampleWeek = new WeekTemplate();
        sampleWeek.setProgram(sampleProgram);
        sampleWeek.setName("Week A");
    }

    @Test
    void findByProgram_validatesOwnership() {
        when(programService.findOwned(userId, programId)).thenReturn(sampleProgram);
        when(weekRepository.findByProgramId(programId)).thenReturn(List.of(sampleWeek));
        List<WeekTemplateResponse> result = weekService.findByProgram(userId, programId);
        assertThat(result).hasSize(1);
        verify(programService).findOwned(userId, programId);
    }

    @Test
    void create_validatesAndSaves() {
        when(programService.findOwned(userId, programId)).thenReturn(sampleProgram);
        when(weekRepository.save(any())).thenReturn(sampleWeek);
        WeekTemplateResponse result = weekService.create(userId, programId, new WeekTemplateRequest("Week A"));
        assertThat(result.name()).isEqualTo("Week A");
    }

    @Test
    void findOwned_notFound_throwsNotFound() {
        when(weekRepository.findById(weekId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> weekService.findOwned(userId, weekId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
