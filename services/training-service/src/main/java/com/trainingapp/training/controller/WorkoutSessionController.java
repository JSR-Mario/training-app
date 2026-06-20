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

    @PostMapping
    public ResponseEntity<WorkoutSessionResponse> startSession(@Valid @RequestBody WorkoutSessionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sessionService.startSession(UserContext.getCurrentUserId(), request));
    }

    @GetMapping("/{id}")
    public WorkoutSessionResponse findById(@PathVariable UUID id) {
        return sessionService.getSession(id, UserContext.getCurrentUserId());
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
}
