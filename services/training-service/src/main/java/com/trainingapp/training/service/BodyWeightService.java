package com.trainingapp.training.service;

import com.trainingapp.training.domain.BodyWeightEntry;
import com.trainingapp.training.dto.BodyWeightRequest;
import com.trainingapp.training.dto.BodyWeightResponse;
import com.trainingapp.training.repository.BodyWeightRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BodyWeightService {

    private final BodyWeightRepository repository;

    public BodyWeightService(BodyWeightRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<BodyWeightResponse> getWeightEntries(UUID userId, LocalDate startDate, LocalDate endDate) {
        return repository.findAllByUserIdAndDateBetweenOrderByDateAsc(userId, startDate, endDate)
                .stream()
                .map(e -> new BodyWeightResponse(e.getId(), e.getDate(), e.getWeightKg()))
                .collect(Collectors.toList());
    }

    @Transactional
    public BodyWeightResponse saveWeightEntry(UUID userId, BodyWeightRequest request) {
        Optional<BodyWeightEntry> existing = repository.findByUserIdAndDate(userId, request.date());

        BodyWeightEntry entry;
        if (existing.isPresent()) {
            entry = existing.get();
            entry.setWeightKg(request.weightKg());
        } else {
            entry = new BodyWeightEntry();
            entry.setUserId(userId);
            entry.setDate(request.date());
            entry.setWeightKg(request.weightKg());
        }

        BodyWeightEntry saved = repository.save(entry);
        return new BodyWeightResponse(saved.getId(), saved.getDate(), saved.getWeightKg());
    }

    @Transactional
    public void deleteWeightEntry(UUID userId, LocalDate date) {
        repository.findByUserIdAndDate(userId, date)
                .ifPresent(repository::delete);
    }
}
