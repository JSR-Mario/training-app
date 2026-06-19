package com.trainingapp.training.controller;

import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.dto.WeekTemplateRequest;
import com.trainingapp.training.dto.WeekTemplateResponse;
import com.trainingapp.training.service.WeekTemplateService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** REST endpoints for week templates within a program. */
@RestController
@RequestMapping("/api/v1/training")
public class WeekTemplateController {

    private final WeekTemplateService weekService;

    public WeekTemplateController(WeekTemplateService weekService) {
        this.weekService = weekService;
    }

    @GetMapping("/programs/{programId}/weeks")
    public List<WeekTemplateResponse> listByProgram(@PathVariable UUID programId) {
        return weekService.findByProgram(UserContext.getCurrentUserId(), programId);
    }

    @PostMapping("/programs/{programId}/weeks")
    public ResponseEntity<WeekTemplateResponse> create(
            @PathVariable UUID programId, @Valid @RequestBody WeekTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(weekService.create(UserContext.getCurrentUserId(), programId, request));
    }

    @GetMapping("/weeks/{id}")
    public WeekTemplateResponse findById(@PathVariable UUID id) {
        return weekService.findById(UserContext.getCurrentUserId(), id);
    }

    @PutMapping("/weeks/{id}")
    public WeekTemplateResponse update(@PathVariable UUID id, @Valid @RequestBody WeekTemplateRequest request) {
        return weekService.update(UserContext.getCurrentUserId(), id, request);
    }

    @DeleteMapping("/weeks/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        weekService.delete(UserContext.getCurrentUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
