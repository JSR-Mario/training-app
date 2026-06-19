package com.trainingapp.training.controller;

import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.dto.DayExerciseRequest;
import com.trainingapp.training.dto.DayExerciseResponse;
import com.trainingapp.training.dto.ReorderItem;
import com.trainingapp.training.service.DayExerciseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** REST endpoints for exercises within a day template, including reordering. */
@RestController
@RequestMapping("/api/v1/training")
public class DayExerciseController {

    private final DayExerciseService dayExerciseService;

    public DayExerciseController(DayExerciseService dayExerciseService) {
        this.dayExerciseService = dayExerciseService;
    }

    @GetMapping("/days/{dayId}/exercises")
    public List<DayExerciseResponse> listByDay(@PathVariable UUID dayId) {
        return dayExerciseService.findByDay(UserContext.getCurrentUserId(), dayId);
    }

    @PostMapping("/days/{dayId}/exercises")
    public ResponseEntity<DayExerciseResponse> create(
            @PathVariable UUID dayId, @Valid @RequestBody DayExerciseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(dayExerciseService.create(UserContext.getCurrentUserId(), dayId, request));
    }

    @PutMapping("/day-exercises/{id}")
    public DayExerciseResponse update(@PathVariable UUID id, @Valid @RequestBody DayExerciseRequest request) {
        return dayExerciseService.update(UserContext.getCurrentUserId(), id, request);
    }

    @DeleteMapping("/day-exercises/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        dayExerciseService.delete(UserContext.getCurrentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/days/{dayId}/exercises/reorder")
    public ResponseEntity<Void> reorder(@PathVariable UUID dayId,
                                         @Valid @RequestBody List<ReorderItem> items) {
        dayExerciseService.reorder(UserContext.getCurrentUserId(), dayId, items);
        return ResponseEntity.noContent().build();
    }
}
