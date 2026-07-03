package com.trainingapp.analytics.controller;

import com.trainingapp.analytics.dto.SessionCompletedEvent;
import com.trainingapp.analytics.service.MetricsCalculationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

/**
 * Internal API controller for receiving events from other services.
 * This endpoint should NEVER be exposed through the API Gateway.
 */
@RestController
@RequestMapping("/internal/events")
public class AnalyticsEventHandlerController {

    private final MetricsCalculationService metricsCalculationService;

    public AnalyticsEventHandlerController(MetricsCalculationService metricsCalculationService) {
        this.metricsCalculationService = metricsCalculationService;
    }

    @PostMapping("/session-completed")
    public ResponseEntity<Void> handleSessionCompleted(@Valid @RequestBody SessionCompletedEvent event) {
        metricsCalculationService.processSessionCompleted(event);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/session-uncompleted")
    public ResponseEntity<Void> handleSessionUncompleted(@Valid @RequestBody com.trainingapp.analytics.dto.SessionUncompletedEvent event) {
        metricsCalculationService.processSessionUncompleted(event);
        return ResponseEntity.ok().build();
    }
}
