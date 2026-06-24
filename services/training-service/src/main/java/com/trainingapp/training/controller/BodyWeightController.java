package com.trainingapp.training.controller;

import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.dto.BodyWeightRequest;
import com.trainingapp.training.dto.BodyWeightResponse;
import com.trainingapp.training.service.BodyWeightService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/training/body-weight")
public class BodyWeightController {

    private final BodyWeightService bodyWeightService;

    public BodyWeightController(BodyWeightService bodyWeightService) {
        this.bodyWeightService = bodyWeightService;
    }

    @GetMapping
    public List<BodyWeightResponse> getWeightEntries(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return bodyWeightService.getWeightEntries(UserContext.getCurrentUserId(), startDate, endDate);
    }

    @PutMapping
    public BodyWeightResponse saveWeightEntry(@Valid @RequestBody BodyWeightRequest request) {
        return bodyWeightService.saveWeightEntry(UserContext.getCurrentUserId(), request);
    }

    @DeleteMapping("/{date}")
    public ResponseEntity<Void> deleteWeightEntry(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        bodyWeightService.deleteWeightEntry(UserContext.getCurrentUserId(), date);
        return ResponseEntity.noContent().build();
    }
}
