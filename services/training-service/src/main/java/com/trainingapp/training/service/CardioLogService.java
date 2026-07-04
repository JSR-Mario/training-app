package com.trainingapp.training.service;

import com.trainingapp.training.domain.CardioLog;
import com.trainingapp.training.dto.CardioLogRequest;
import com.trainingapp.training.dto.CardioLogResponse;
import com.trainingapp.training.repository.CardioLogRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CardioLogService {

    private final CardioLogRepository cardioLogRepository;

    public CardioLogService(CardioLogRepository cardioLogRepository) {
        this.cardioLogRepository = cardioLogRepository;
    }

    @Transactional
    public CardioLogResponse logCardio(UUID userId, CardioLogRequest request) {
        CardioLog log = new CardioLog();
        log.setUserId(userId);
        log.setDurationMinutes(request.durationMinutes());
        log.setCardioType(request.cardioType());
        log.setPerformedOn(request.performedOn());
        
        CardioLog saved = cardioLogRepository.save(log);
        return mapToResponse(saved);
    }

    public List<CardioLogResponse> getLogsForUser(UUID userId) {
        return cardioLogRepository.findByUserIdOrderByPerformedOnAsc(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteLog(UUID logId, UUID userId) {
        CardioLog log = cardioLogRepository.findById(logId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cardio log not found"));
            
        if (!log.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your log");
        }
        
        cardioLogRepository.delete(log);
    }

    private CardioLogResponse mapToResponse(CardioLog log) {
        return new CardioLogResponse(
            log.getId(),
            log.getDurationMinutes(),
            log.getCardioType(),
            log.getPerformedOn(),
            log.getCreatedAt()
        );
    }
}
