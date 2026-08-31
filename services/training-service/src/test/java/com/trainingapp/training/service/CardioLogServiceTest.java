package com.trainingapp.training.service;

import com.trainingapp.training.domain.CardioLog;
import com.trainingapp.training.dto.CardioLogRequest;
import com.trainingapp.training.dto.CardioLogResponse;
import com.trainingapp.training.repository.CardioLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardioLogServiceTest {

    @Mock
    private CardioLogRepository cardioLogRepository;

    @InjectMocks
    private CardioLogService cardioLogService;

    private UUID userId;
    private UUID logId;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        logId = UUID.randomUUID();
        today = LocalDate.now();
    }

    @Test
    void testLogCardio_WithDistance() {
        BigDecimal distance = BigDecimal.valueOf(5.25);
        CardioLogRequest request = new CardioLogRequest(30, "Outdoor Running", distance, today);
        CardioLog saved = new CardioLog();
        saved.setId(logId);
        saved.setUserId(userId);
        saved.setDurationMinutes(30);
        saved.setCardioType("Outdoor Running");
        saved.setDistanceKm(distance);
        saved.setPerformedOn(today);

        when(cardioLogRepository.save(any(CardioLog.class))).thenReturn(saved);

        CardioLogResponse response = cardioLogService.logCardio(userId, request);

        assertNotNull(response);
        assertEquals(logId, response.id());
        assertEquals(30, response.durationMinutes());
        assertEquals("Outdoor Running", response.cardioType());
        assertEquals(distance, response.distanceKm());
        assertEquals(today, response.performedOn());
    }

    @Test
    void testLogCardio_WithoutDistance() {
        CardioLogRequest request = new CardioLogRequest(45, "Jump Rope", null, today);
        CardioLog saved = new CardioLog();
        saved.setId(logId);
        saved.setUserId(userId);
        saved.setDurationMinutes(45);
        saved.setCardioType("Jump Rope");
        saved.setDistanceKm(null);
        saved.setPerformedOn(today);

        when(cardioLogRepository.save(any(CardioLog.class))).thenReturn(saved);

        CardioLogResponse response = cardioLogService.logCardio(userId, request);

        assertNotNull(response);
        assertEquals(logId, response.id());
        assertEquals(45, response.durationMinutes());
        assertEquals("Jump Rope", response.cardioType());
        assertNull(response.distanceKm());
        assertEquals(today, response.performedOn());
    }

    @Test
    void testGetLogsForUser() {
        CardioLog log = new CardioLog();
        log.setId(logId);
        log.setUserId(userId);
        log.setDurationMinutes(45);
        log.setCardioType("Cycling");
        log.setDistanceKm(BigDecimal.valueOf(15.0));
        log.setPerformedOn(today);

        when(cardioLogRepository.findByUserIdOrderByPerformedOnAsc(userId)).thenReturn(List.of(log));

        List<CardioLogResponse> responseList = cardioLogService.getLogsForUser(userId);

        assertEquals(1, responseList.size());
        assertEquals("Cycling", responseList.get(0).cardioType());
        assertEquals(45, responseList.get(0).durationMinutes());
        assertEquals(BigDecimal.valueOf(15.0), responseList.get(0).distanceKm());
    }

    @Test
    void testUpdateLog_Success() {
        CardioLog log = new CardioLog();
        log.setId(logId);
        log.setUserId(userId);
        log.setDurationMinutes(30);
        log.setCardioType("Outdoor Running");
        log.setDistanceKm(BigDecimal.valueOf(5.0));
        log.setPerformedOn(today);

        CardioLogRequest updateRequest = new CardioLogRequest(50, "Treadmill", BigDecimal.valueOf(8.5), today);

        when(cardioLogRepository.findById(logId)).thenReturn(Optional.of(log));
        when(cardioLogRepository.save(any(CardioLog.class))).thenReturn(log);

        CardioLogResponse response = cardioLogService.updateLog(logId, userId, updateRequest);

        assertEquals(50, response.durationMinutes());
        assertEquals("Treadmill", response.cardioType());
        assertEquals(BigDecimal.valueOf(8.5), response.distanceKm());
        verify(cardioLogRepository).save(log);
    }

    @Test
    void testUpdateLog_ForbiddenForDifferentUser() {
        CardioLog log = new CardioLog();
        log.setId(logId);
        log.setUserId(UUID.randomUUID()); // Different user

        CardioLogRequest updateRequest = new CardioLogRequest(50, "Treadmill", BigDecimal.valueOf(8.5), today);

        when(cardioLogRepository.findById(logId)).thenReturn(Optional.of(log));

        assertThrows(ResponseStatusException.class, () -> cardioLogService.updateLog(logId, userId, updateRequest));
    }

    @Test
    void testDeleteLog_Success() {
        CardioLog log = new CardioLog();
        log.setId(logId);
        log.setUserId(userId);

        when(cardioLogRepository.findById(logId)).thenReturn(Optional.of(log));

        cardioLogService.deleteLog(logId, userId);

        verify(cardioLogRepository).delete(log);
    }
}
