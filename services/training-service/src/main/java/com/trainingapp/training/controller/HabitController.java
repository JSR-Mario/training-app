package com.trainingapp.training.controller;

import com.trainingapp.training.dto.HabitRequest;
import com.trainingapp.training.dto.HabitResponse;
import com.trainingapp.training.service.HabitService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/habits")
public class HabitController {

    private final HabitService habitService;

    public HabitController(HabitService habitService) {
        this.habitService = habitService;
    }

    @GetMapping
    public ResponseEntity<List<HabitResponse>> getHabits(
            @RequestParam(name = "today", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
        if (today == null) {
            today = LocalDate.now();
        }
        return ResponseEntity.ok(habitService.getHabits(today));
    }

    @PostMapping
    public ResponseEntity<HabitResponse> createHabit(@RequestBody @Valid HabitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(habitService.createHabit(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HabitResponse> updateHabit(@PathVariable UUID id, @RequestBody @Valid HabitRequest request) {
        return ResponseEntity.ok(habitService.updateHabit(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHabit(@PathVariable UUID id) {
        habitService.deleteHabit(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/logs")
    public ResponseEntity<HabitResponse> toggleLog(
            @PathVariable UUID id,
            @RequestParam(name = "date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(name = "today", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
        if (today == null) {
            today = LocalDate.now();
        }
        return ResponseEntity.ok(habitService.toggleLog(id, date, today));
    }
}
