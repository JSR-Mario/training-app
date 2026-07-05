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
        program.setActive(request.isActive());
        if (request.currentWeek() != null) {
            program.setCurrentWeek(request.currentWeek());
        }
        
        TrainingProgram saved = programRepository.save(program);
        
        if (saved.isActive()) {
            programRepository.deactivateAllOtherUserPrograms(userId, saved.getId());
        }
        
        return toResponse(saved);
    }

    @Transactional
    public ProgramResponse update(UUID userId, UUID programId, ProgramRequest request) {
        TrainingProgram program = findOwned(userId, programId);
        program.setName(request.name());
        program.setDurationWeeks(request.durationWeeks());
        program.setStartDate(request.startDate());
        program.setActive(request.isActive());
        if (request.currentWeek() != null) {
            program.setCurrentWeek(request.currentWeek());
        }
        
        TrainingProgram saved = programRepository.save(program);
        
        if (saved.isActive()) {
            programRepository.deactivateAllOtherUserPrograms(userId, saved.getId());
        }
        
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID userId, UUID programId) {
        TrainingProgram program = findOwned(userId, programId);
        programRepository.delete(program);
    }

    @Transactional
    public ProgramResponse advanceWeek(UUID userId, UUID programId) {
        TrainingProgram program = findOwned(userId, programId);
        program.setCurrentWeek(program.getCurrentWeek() + 1);
        if (program.getCurrentWeek() > program.getDurationWeeks()) {
            program.setActive(false);
            // Optionally, we could reset currentWeek to 1 or leave it at durationWeeks
            program.setCurrentWeek(program.getDurationWeeks()); 
        }
        
        TrainingProgram saved = programRepository.save(program);
        return toResponse(saved);
    }

    /** Package-private: validates program belongs to user and returns entity. */
    @Transactional(readOnly = true)
    public TrainingProgram findOwned(UUID userId, UUID programId) {
        return programRepository.findByIdAndUserId(programId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Program not found."));
    }

    private ProgramResponse toResponse(TrainingProgram p) {
        return new ProgramResponse(p.getId(), p.getName(), p.getDurationWeeks(), p.getStartDate(), p.isActive(), p.getCurrentWeek(), p.getCreatedAt());
    }
}
