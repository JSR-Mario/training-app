package com.trainingapp.training.controller;

import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.dto.ExerciseRequest;
import com.trainingapp.training.dto.ExerciseResponse;
import com.trainingapp.training.dto.ExerciseTargetRequest;
import com.trainingapp.training.dto.ExerciseTargetResponse;
import com.trainingapp.training.service.ExerciseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** REST endpoints for the exercise catalog and body-part targets. */
@RestController
@RequestMapping("/api/v1/training")
public class ExerciseController {

    private final ExerciseService exerciseService;

    public ExerciseController(ExerciseService exerciseService) {
        this.exerciseService = exerciseService;
    }

    @GetMapping("/exercises")
    public List<ExerciseResponse> list() {
        return exerciseService.findAll(UserContext.getCurrentUserId());
    }

    @PostMapping("/exercises")
    public ResponseEntity<ExerciseResponse> create(@Valid @RequestBody ExerciseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(exerciseService.create(UserContext.getCurrentUserId(), request));
    }

    @PutMapping("/exercises/{id}")
    public ExerciseResponse update(@PathVariable UUID id, @Valid @RequestBody ExerciseRequest request) {
        return exerciseService.update(UserContext.getCurrentUserId(), id, request);
    }

    @DeleteMapping("/exercises/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        exerciseService.delete(UserContext.getCurrentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/exercises/{id}/targets")
    public List<ExerciseTargetResponse> listTargets(@PathVariable UUID id) {
        return exerciseService.findTargets(UserContext.getCurrentUserId(), id);
    }

    @PostMapping("/exercises/{id}/targets")
    public ResponseEntity<ExerciseTargetResponse> createTarget(
            @PathVariable UUID id, @Valid @RequestBody ExerciseTargetRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(exerciseService.createTarget(UserContext.getCurrentUserId(), id, request));
    }

    @PutMapping("/exercise-targets/{id}")
    public ExerciseTargetResponse updateTarget(
            @PathVariable UUID id, @Valid @RequestBody ExerciseTargetRequest request) {
        return exerciseService.updateTarget(UserContext.getCurrentUserId(), id, request);
    }

    @DeleteMapping("/exercise-targets/{id}")
    public ResponseEntity<Void> deleteTarget(@PathVariable UUID id) {
        exerciseService.deleteTarget(UserContext.getCurrentUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
