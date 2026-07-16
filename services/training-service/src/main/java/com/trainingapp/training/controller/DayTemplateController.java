package com.trainingapp.training.controller;

import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.dto.DayTemplateRequest;
import com.trainingapp.training.dto.DayTemplateResponse;
import com.trainingapp.training.service.DayTemplateService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** REST endpoints for day templates within a week. */
@RestController
@RequestMapping("/api/v1/training")
public class DayTemplateController {

    private final DayTemplateService dayService;

    public DayTemplateController(DayTemplateService dayService) {
        this.dayService = dayService;
    }

    @GetMapping("/weeks/{weekId}/days")
    public List<DayTemplateResponse> listByWeek(@PathVariable UUID weekId) {
        return dayService.findByWeek(UserContext.getCurrentUserId(), weekId);
    }

    @PostMapping("/weeks/{weekId}/days")
    public ResponseEntity<DayTemplateResponse> create(
            @PathVariable UUID weekId, @Valid @RequestBody DayTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(dayService.create(UserContext.getCurrentUserId(), weekId, request));
    }

    @GetMapping("/days/{id}")
    public DayTemplateResponse findById(@PathVariable UUID id) {
        return dayService.findById(UserContext.getCurrentUserId(), id);
    }

    @PutMapping("/days/{id}")
    public DayTemplateResponse update(@PathVariable UUID id, @Valid @RequestBody DayTemplateRequest request) {
        return dayService.update(UserContext.getCurrentUserId(), id, request);
    }

    @DeleteMapping("/days/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        dayService.delete(UserContext.getCurrentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/weeks/{weekId}/days/reorder")
    public List<DayTemplateResponse> reorder(
            @PathVariable UUID weekId, @Valid @RequestBody List<com.trainingapp.training.dto.DayReorderRequest> requests) {
        return dayService.reorderDays(UserContext.getCurrentUserId(), weekId, requests);
    }
}
