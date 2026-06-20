package com.trainingapp.training.controller;

import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.dto.WorkoutSetRequest;
import com.trainingapp.training.dto.WorkoutSetResponse;
import com.trainingapp.training.service.WorkoutSetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** REST endpoints for workout sets. */
@RestController
@RequestMapping("/api/v1/training")
public class WorkoutSetController {

    private final WorkoutSetService setService;

    public WorkoutSetController(WorkoutSetService setService) {
        this.setService = setService;
    }

    @GetMapping("/sessions/{sessionId}/sets")
    public List<WorkoutSetResponse> listBySession(@PathVariable UUID sessionId) {
        return setService.getSetsForSession(sessionId, UserContext.getCurrentUserId());
    }

    @PostMapping("/sessions/{sessionId}/sets")
    public ResponseEntity<WorkoutSetResponse> logSet(
            @PathVariable UUID sessionId, @Valid @RequestBody WorkoutSetRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(setService.logSet(sessionId, UserContext.getCurrentUserId(), request));
    }

    @PutMapping("/workout-sets/{id}")
    public WorkoutSetResponse update(
            @PathVariable UUID id, @Valid @RequestBody WorkoutSetRequest request) {
        return setService.updateSet(id, UserContext.getCurrentUserId(), request);
    }

    @DeleteMapping("/workout-sets/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        setService.deleteSet(id, UserContext.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
