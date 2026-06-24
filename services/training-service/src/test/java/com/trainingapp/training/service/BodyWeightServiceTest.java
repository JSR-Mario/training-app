package com.trainingapp.training.service;

import com.trainingapp.training.domain.BodyWeightEntry;
import com.trainingapp.training.dto.BodyWeightRequest;
import com.trainingapp.training.dto.BodyWeightResponse;
import com.trainingapp.training.repository.BodyWeightRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BodyWeightServiceTest {

    @Mock
    private BodyWeightRepository repository;

    @InjectMocks
    private BodyWeightService service;

    private UUID userId;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        today = LocalDate.now();
    }

    @Test
    void testGetWeightEntries() {
        BodyWeightEntry e1 = new BodyWeightEntry();
        e1.setId(UUID.randomUUID());
        e1.setUserId(userId);
        e1.setDate(today.minusDays(1));
        e1.setWeightKg(new BigDecimal("70.5"));

        when(repository.findAllByUserIdAndDateBetweenOrderByDateAsc(userId, today.minusDays(7), today))
                .thenReturn(List.of(e1));

        List<BodyWeightResponse> result = service.getWeightEntries(userId, today.minusDays(7), today);

        assertEquals(1, result.size());
        assertEquals(e1.getId(), result.get(0).id());
        assertEquals(e1.getWeightKg(), result.get(0).weightKg());
    }

    @Test
    void testSaveWeightEntry_CreatesNew() {
        BodyWeightRequest request = new BodyWeightRequest(today, new BigDecimal("75.0"));
        
        when(repository.findByUserIdAndDate(userId, today)).thenReturn(Optional.empty());

        BodyWeightEntry savedEntity = new BodyWeightEntry();
        savedEntity.setId(UUID.randomUUID());
        savedEntity.setDate(today);
        savedEntity.setWeightKg(new BigDecimal("75.0"));
        when(repository.save(any(BodyWeightEntry.class))).thenReturn(savedEntity);

        BodyWeightResponse response = service.saveWeightEntry(userId, request);

        assertEquals(today, response.date());
        assertEquals(new BigDecimal("75.0"), response.weightKg());

        ArgumentCaptor<BodyWeightEntry> captor = ArgumentCaptor.forClass(BodyWeightEntry.class);
        verify(repository).save(captor.capture());
        
        BodyWeightEntry captured = captor.getValue();
        assertEquals(userId, captured.getUserId());
        assertEquals(today, captured.getDate());
        assertEquals(new BigDecimal("75.0"), captured.getWeightKg());
    }

    @Test
    void testSaveWeightEntry_UpdatesExisting() {
        BodyWeightRequest request = new BodyWeightRequest(today, new BigDecimal("76.0"));

        BodyWeightEntry existing = new BodyWeightEntry();
        existing.setId(UUID.randomUUID());
        existing.setUserId(userId);
        existing.setDate(today);
        existing.setWeightKg(new BigDecimal("75.0"));

        when(repository.findByUserIdAndDate(userId, today)).thenReturn(Optional.of(existing));
        when(repository.save(any(BodyWeightEntry.class))).thenReturn(existing);

        BodyWeightResponse response = service.saveWeightEntry(userId, request);

        assertEquals(new BigDecimal("76.0"), response.weightKg());
        assertEquals(new BigDecimal("76.0"), existing.getWeightKg());
    }

    @Test
    void testDeleteWeightEntry() {
        BodyWeightEntry existing = new BodyWeightEntry();
        when(repository.findByUserIdAndDate(userId, today)).thenReturn(Optional.of(existing));

        service.deleteWeightEntry(userId, today);

        verify(repository).delete(existing);
    }
}
