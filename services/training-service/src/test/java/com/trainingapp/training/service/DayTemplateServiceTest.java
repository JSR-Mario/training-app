package com.trainingapp.training.service;

import com.trainingapp.training.domain.DayTemplate;
import com.trainingapp.training.domain.WeekTemplate;
import com.trainingapp.training.dto.DayTemplateRequest;
import com.trainingapp.training.dto.DayTemplateResponse;
import com.trainingapp.training.exception.ResourceNotFoundException;
import com.trainingapp.training.repository.DayTemplateRepository;
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
class DayTemplateServiceTest {

    @Mock private DayTemplateRepository dayRepository;
    @Mock private WeekTemplateService weekService;
    @InjectMocks private DayTemplateService dayService;

    private UUID userId;
    private UUID weekId;
    private UUID dayId;
    private WeekTemplate sampleWeek;
    private DayTemplate sampleDay;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        weekId = UUID.randomUUID();
        dayId = UUID.randomUUID();
        sampleWeek = new WeekTemplate();
        sampleWeek.setName("Week A");
        sampleDay = new DayTemplate();
        sampleDay.setWeekTemplate(sampleWeek);
        sampleDay.setName("Push");
    }

    @Test
    void findByWeek_validatesOwnership() {
        when(weekService.findOwned(userId, weekId)).thenReturn(sampleWeek);
        when(dayRepository.findByWeekTemplateIdOrderBySortOrderAsc(weekId)).thenReturn(List.of(sampleDay));
        List<DayTemplateResponse> result = dayService.findByWeek(userId, weekId);
        assertThat(result).hasSize(1);
        verify(weekService).findOwned(userId, weekId);
    }

    @Test
    void create_validatesAndSaves() {
        when(weekService.findOwned(userId, weekId)).thenReturn(sampleWeek);
        when(dayRepository.findByWeekTemplateIdOrderBySortOrderAsc(weekId)).thenReturn(List.of());
        when(dayRepository.save(any())).thenReturn(sampleDay);
        DayTemplateResponse result = dayService.create(userId, weekId, new DayTemplateRequest("Push"));
        assertThat(result.name()).isEqualTo("Push");
    }

    @Test
    void findOwned_notFound_throwsNotFound() {
        when(dayRepository.findById(dayId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> dayService.findOwned(userId, dayId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
