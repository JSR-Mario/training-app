package com.trainingapp.training.controller;

import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.dto.WorkoutSessionRequest;
import com.trainingapp.training.dto.WorkoutSessionResponse;
import com.trainingapp.training.service.WorkoutSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** REST endpoints for workout sessions. */
@RestController
@RequestMapping("/api/v1/training/sessions")
public class WorkoutSessionController {

    private final WorkoutSessionService sessionService;

    public WorkoutSessionController(WorkoutSessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping
    public List<WorkoutSessionResponse> listByProgramAndWeek(@RequestParam UUID programId, @RequestParam int weekNumber) {
        return sessionService.getSessions(UserContext.getCurrentUserId(), programId, weekNumber);
    }

    @GetMapping("/active")
    public ResponseEntity<WorkoutSessionResponse> getActiveSession() {
        WorkoutSessionResponse active = sessionService.getActiveSession(UserContext.getCurrentUserId());
        if (active == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(active);
    }

    @PostMapping
    public ResponseEntity<WorkoutSessionResponse> startSession(@Valid @RequestBody WorkoutSessionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sessionService.startSession(UserContext.getCurrentUserId(), request));
    }

    @GetMapping("/{id}")
    public WorkoutSessionResponse findById(@PathVariable UUID id) {
        return sessionService.getSession(id, UserContext.getCurrentUserId());
    }

    @PatchMapping("/{id}/notes")
    public WorkoutSessionResponse updateNotes(@PathVariable UUID id, @Valid @RequestBody com.trainingapp.training.dto.SessionNotesRequest request) {
        return sessionService.updateNotes(id, UserContext.getCurrentUserId(), request);
    }

    @PutMapping("/{id}/ratings/{dayExerciseId}")
    public WorkoutSessionResponse updateRating(@PathVariable UUID id, @PathVariable UUID dayExerciseId, @Valid @RequestBody com.trainingapp.training.dto.SessionRatingRequest request) {
        return sessionService.updateRating(id, UserContext.getCurrentUserId(), dayExerciseId, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        sessionService.deleteSession(id, UserContext.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Void> completeSession(@PathVariable UUID id) {
        sessionService.completeSession(id, UserContext.getCurrentUserId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/suggestions")
    public List<com.trainingapp.training.dto.ExerciseSuggestionResponse> getExerciseSuggestions(@PathVariable UUID id) {
        return sessionService.getExerciseSuggestions(id, UserContext.getCurrentUserId());
    }
}
