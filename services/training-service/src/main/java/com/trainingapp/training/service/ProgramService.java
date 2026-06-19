package com.trainingapp.training.service;

import com.trainingapp.training.domain.TrainingProgram;
import com.trainingapp.training.dto.ProgramRequest;
import com.trainingapp.training.dto.ProgramResponse;
import com.trainingapp.training.exception.ResourceNotFoundException;
import com.trainingapp.training.repository.TrainingProgramRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Business logic for training programs. All reads and writes are scoped
 * to the authenticated user's ID.
 */
@Service
public class ProgramService {

    private final TrainingProgramRepository programRepository;

    public ProgramService(TrainingProgramRepository programRepository) {
        this.programRepository = programRepository;
    }

    @Transactional(readOnly = true)
    public List<ProgramResponse> findAll(UUID userId) {
        return programRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProgramResponse findById(UUID userId, UUID programId) {
        return toResponse(findOwned(userId, programId));
    }

    @Transactional
    public ProgramResponse create(UUID userId, ProgramRequest request) {
        TrainingProgram program = new TrainingProgram();
        program.setUserId(userId);
        program.setName(request.name());
        program.setDurationWeeks(request.durationWeeks());
        program.setStartDate(request.startDate());
        return toResponse(programRepository.save(program));
    }

    @Transactional
    public ProgramResponse update(UUID userId, UUID programId, ProgramRequest request) {
        TrainingProgram program = findOwned(userId, programId);
        program.setName(request.name());
        program.setDurationWeeks(request.durationWeeks());
        program.setStartDate(request.startDate());
        return toResponse(programRepository.save(program));
    }

    @Transactional
    public void delete(UUID userId, UUID programId) {
        TrainingProgram program = findOwned(userId, programId);
        programRepository.delete(program);
    }

    /** Package-private: validates program belongs to user and returns entity. */
    TrainingProgram findOwned(UUID userId, UUID programId) {
        return programRepository.findByIdAndUserId(programId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Program not found."));
    }

    private ProgramResponse toResponse(TrainingProgram p) {
        return new ProgramResponse(p.getId(), p.getName(), p.getDurationWeeks(), p.getStartDate(), p.getCreatedAt());
    }
}
