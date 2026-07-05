package com.trainingapp.training.controller;

import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.dto.ProgramRequest;
import com.trainingapp.training.dto.ProgramResponse;
import com.trainingapp.training.service.ProgramService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** REST endpoints for training programs. */
@RestController
@RequestMapping("/api/v1/training/programs")
public class ProgramController {

    private final ProgramService programService;

    public ProgramController(ProgramService programService) {
        this.programService = programService;
    }

    @GetMapping
    public List<ProgramResponse> list() {
        return programService.findAll(UserContext.getCurrentUserId());
    }

    @GetMapping("/{id}")
    public ProgramResponse findById(@PathVariable UUID id) {
        return programService.findById(UserContext.getCurrentUserId(), id);
    }

    @PostMapping
    public ResponseEntity<ProgramResponse> create(@Valid @RequestBody ProgramRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(programService.create(UserContext.getCurrentUserId(), request));
    }

    @PutMapping("/{id}")
    public ProgramResponse update(@PathVariable UUID id, @Valid @RequestBody ProgramRequest request) {
        return programService.update(UserContext.getCurrentUserId(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        programService.delete(UserContext.getCurrentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/advance-week")
    public ProgramResponse advanceWeek(@PathVariable UUID id) {
        return programService.advanceWeek(UserContext.getCurrentUserId(), id);
    }
}
