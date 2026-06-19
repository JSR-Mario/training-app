package com.trainingapp.training.service;

import com.trainingapp.training.domain.TrainingProgram;
import com.trainingapp.training.domain.WeekTemplate;
import com.trainingapp.training.dto.WeekTemplateRequest;
import com.trainingapp.training.dto.WeekTemplateResponse;
import com.trainingapp.training.exception.ResourceNotFoundException;
import com.trainingapp.training.repository.WeekTemplateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Business logic for week templates. Validates that the parent program
 * belongs to the authenticated user before any read or write.
 */
@Service
public class WeekTemplateService {

    private final WeekTemplateRepository weekRepository;
    private final ProgramService programService;

    public WeekTemplateService(WeekTemplateRepository weekRepository,
                               ProgramService programService) {
        this.weekRepository = weekRepository;
        this.programService = programService;
    }

    @Transactional(readOnly = true)
    public List<WeekTemplateResponse> findByProgram(UUID userId, UUID programId) {
        programService.findOwned(userId, programId);
        return weekRepository.findByProgramId(programId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public WeekTemplateResponse findById(UUID userId, UUID weekId) {
        return toResponse(findOwned(userId, weekId));
    }

    @Transactional
    public WeekTemplateResponse create(UUID userId, UUID programId, WeekTemplateRequest request) {
        TrainingProgram program = programService.findOwned(userId, programId);
        WeekTemplate week = new WeekTemplate();
        week.setProgram(program);
        week.setName(request.name());
        return toResponse(weekRepository.save(week));
    }

    @Transactional
    public WeekTemplateResponse update(UUID userId, UUID weekId, WeekTemplateRequest request) {
        WeekTemplate week = findOwned(userId, weekId);
        week.setName(request.name());
        return toResponse(weekRepository.save(week));
    }

    @Transactional
    public void delete(UUID userId, UUID weekId) {
        WeekTemplate week = findOwned(userId, weekId);
        weekRepository.delete(week);
    }

    /** Package-private: validates week's parent program belongs to user. */
    WeekTemplate findOwned(UUID userId, UUID weekId) {
        WeekTemplate week = weekRepository.findById(weekId)
                .orElseThrow(() -> new ResourceNotFoundException("Week template not found."));
        programService.findOwned(userId, week.getProgram().getId());
        return week;
    }

    private WeekTemplateResponse toResponse(WeekTemplate w) {
        return new WeekTemplateResponse(w.getId(), w.getProgram().getId(), w.getName());
    }
}
