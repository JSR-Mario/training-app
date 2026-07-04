package com.trainingapp.training.controller;

import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.dto.CardioLogRequest;
import com.trainingapp.training.dto.CardioLogResponse;
import com.trainingapp.training.service.CardioLogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/training/cardio-logs")
public class CardioLogController {

    private final CardioLogService cardioLogService;

    public CardioLogController(CardioLogService cardioLogService) {
        this.cardioLogService = cardioLogService;
    }

    @PostMapping
    public ResponseEntity<CardioLogResponse> logCardio(@Valid @RequestBody CardioLogRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cardioLogService.logCardio(UserContext.getCurrentUserId(), request));
    }

    @GetMapping
    public List<CardioLogResponse> getLogs() {
        return cardioLogService.getLogsForUser(UserContext.getCurrentUserId());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLog(@PathVariable UUID id) {
        cardioLogService.deleteLog(id, UserContext.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
