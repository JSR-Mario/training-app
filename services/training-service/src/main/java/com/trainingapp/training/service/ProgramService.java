package com.trainingapp.training.service;

import com.trainingapp.training.domain.DayExercise;
import com.trainingapp.training.domain.DayTemplate;
import com.trainingapp.training.domain.ProgramRating;
import com.trainingapp.training.domain.TrainingProgram;
import com.trainingapp.training.domain.WeekTemplate;
import com.trainingapp.training.dto.ProgramRequest;
import com.trainingapp.training.dto.ProgramResponse;
import com.trainingapp.training.exception.ResourceNotFoundException;
import com.trainingapp.training.repository.DayExerciseRepository;
import com.trainingapp.training.repository.DayTemplateRepository;
import com.trainingapp.training.repository.ProgramRatingRepository;
import com.trainingapp.training.repository.TrainingProgramRepository;
import com.trainingapp.training.repository.WeekTemplateRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Business logic for training programs. All reads and writes are scoped
 * to the authenticated user's ID or public templates.
 */
@Service
public class ProgramService {

    private final TrainingProgramRepository programRepository;
    private final WeekTemplateRepository weekTemplateRepository;
    private final DayTemplateRepository dayTemplateRepository;
    private final DayExerciseRepository dayExerciseRepository;
    private final ProgramRatingRepository programRatingRepository;

    public ProgramService(TrainingProgramRepository programRepository,
                          WeekTemplateRepository weekTemplateRepository,
                          DayTemplateRepository dayTemplateRepository,
                          DayExerciseRepository dayExerciseRepository,
                          ProgramRatingRepository programRatingRepository) {
        this.programRepository = programRepository;
        this.weekTemplateRepository = weekTemplateRepository;
        this.dayTemplateRepository = dayTemplateRepository;
        this.dayExerciseRepository = dayExerciseRepository;
        this.programRatingRepository = programRatingRepository;
    }

    @Transactional(readOnly = true)
    public List<ProgramResponse> findAll(UUID userId) {
        List<TrainingProgram> programs = programRepository.findByUserId(userId);
        if (programs.isEmpty()) {
            return List.of();
        }

        List<UUID> programIds = programs.stream().map(TrainingProgram::getId).toList();
        List<Object[]> rawStats = programRatingRepository.getAverageRatingsForUserProgramsBatch(userId, programIds);

        Map<UUID, RatingStats> statsMap = new HashMap<>();
        for (Object[] row : rawStats) {
            UUID progId = (UUID) row[0];
            Double avg = row[1] != null ? ((Number) row[1]).doubleValue() : null;
            long count = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            statsMap.put(progId, new RatingStats(avg, (int) count));
        }

        return programs.stream()
                .map(p -> {
                    RatingStats stats = statsMap.getOrDefault(p.getId(), new RatingStats(null, 0));
                    return toResponse(p, stats.averageRating(), stats.ratingsCount(), null);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProgramResponse> findPublicPrograms() {
        List<TrainingProgram> publicPrograms = programRepository.findByIsPublicTrue();
        if (publicPrograms.isEmpty()) {
            return List.of();
        }

        List<UUID> publicIds = publicPrograms.stream().map(TrainingProgram::getId).toList();
        List<Object[]> rawStats = programRatingRepository.getPublicProgramsRatingStatsBatch(publicIds);

        Map<UUID, RatingStats> statsMap = new HashMap<>();
        for (Object[] row : rawStats) {
            UUID progId = (UUID) row[0];
            Double avg = row[1] != null ? ((Number) row[1]).doubleValue() : null;
            long count = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            if (progId != null) {
                statsMap.put(progId, new RatingStats(avg, (int) count));
            }
        }

        return publicPrograms.stream()
                .map(p -> {
                    RatingStats stats = statsMap.getOrDefault(p.getId(), new RatingStats(null, 0));
                    return toResponse(p, stats.averageRating(), stats.ratingsCount(), null);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public ProgramResponse findById(UUID userId, UUID programId) {
        TrainingProgram program = findOwnedOrPublic(userId, programId);
        Double avgRating = null;
        int count = 0;

        if (program.getIsPublic()) {
            List<Object[]> stats = programRatingRepository.getPublicProgramRatingStats(program.getId());
            if (!stats.isEmpty() && stats.get(0) != null) {
                Object[] row = stats.get(0);
                avgRating = row[0] != null ? ((Number) row[0]).doubleValue() : null;
                count = row[1] != null ? ((Number) row[1]).intValue() : 0;
            }
        } else {
            List<Object[]> stats = programRatingRepository.getUserProgramRatingStats(program.getId(), userId);
            if (!stats.isEmpty() && stats.get(0) != null) {
                Object[] row = stats.get(0);
                avgRating = row[0] != null ? ((Number) row[0]).doubleValue() : null;
                count = row[1] != null ? ((Number) row[1]).intValue() : 0;
            }
        }

        Optional<ProgramRating> lastRating = programRatingRepository
                .findFirstByProgramIdAndUserIdOrderByCreatedAtDesc(program.getId(), userId);
        Integer userRating = lastRating.map(ProgramRating::getRating).orElse(null);

        return toResponse(program, avgRating, count, userRating);
    }

    @Transactional
    public ProgramResponse create(UUID userId, ProgramRequest request) {
        TrainingProgram program = new TrainingProgram();
        program.setUserId(userId);
        program.setName(request.name());
        program.setDescription(request.description());
        program.setDurationWeeks(request.durationWeeks());
        program.setStartDate(request.startDate());
        program.setActive(true); // Auto-activate newly created program
        program.setGoal(request.goal());
        if (request.currentWeek() != null) {
            program.setCurrentWeek(request.currentWeek());
        }

        if (request.isPublic()) {
            if (!isAdmin()) {
                throw new AccessDeniedException("Only administrators can create public programs.");
            }
            program.setIsPublic(true);
        } else {
            program.setIsPublic(false);
        }

        TrainingProgram saved = programRepository.save(program);
        programRepository.deactivateAllOtherUserPrograms(userId, saved.getId());

        return toResponse(saved, null, 0, null);
    }

    @Transactional
    public ProgramResponse update(UUID userId, UUID programId, ProgramRequest request) {
        TrainingProgram program = findOwned(userId, programId);
        program.setName(request.name());
        program.setDescription(request.description());
        program.setDurationWeeks(request.durationWeeks());
        program.setStartDate(request.startDate());
        program.setActive(request.isActive());
        program.setGoal(request.goal());
        if (request.currentWeek() != null) {
            program.setCurrentWeek(request.currentWeek());
        }

        if (request.isPublic() != program.getIsPublic()) {
            if (!isAdmin()) {
                throw new AccessDeniedException("Only administrators can change public visibility of a program.");
            }
            if (request.isPublic()) {
                validateAllExercisesArePublic(programId);
            }
            program.setIsPublic(request.isPublic());
        }

        TrainingProgram saved = programRepository.save(program);

        if (saved.isActive()) {
            programRepository.deactivateAllOtherUserPrograms(userId, saved.getId());
        }

        return findById(userId, saved.getId());
    }

    @Transactional
    public ProgramResponse deactivate(UUID userId, UUID programId) {
        TrainingProgram program = findOwned(userId, programId);
        program.setActive(false);
        TrainingProgram saved = programRepository.save(program);
        return findById(userId, saved.getId());
    }

    @Transactional
    public ProgramResponse copyPublicProgram(UUID userId, UUID publicProgramId) {
        TrainingProgram source = programRepository.findById(publicProgramId)
                .orElseThrow(() -> new ResourceNotFoundException("Program not found."));

        if (!source.getIsPublic()) {
            throw new IllegalArgumentException("Program is not public.");
        }

        // Create new cloned program for the user
        TrainingProgram copy = new TrainingProgram();
        copy.setUserId(userId);
        copy.setName(source.getName());
        copy.setDescription(source.getDescription());
        copy.setDurationWeeks(source.getDurationWeeks());
        copy.setActive(true);
        copy.setGoal(source.getGoal());
        copy.setIsPublic(false);
        copy.setSourceProgramId(source.getId());
        TrainingProgram savedProgram = programRepository.save(copy);

        // Deactivate user's existing programs
        programRepository.deactivateAllOtherUserPrograms(userId, savedProgram.getId());

        // Deep copy weeks -> days -> day-exercises
        List<WeekTemplate> sourceWeeks = weekTemplateRepository.findByProgramId(source.getId());
        for (WeekTemplate sourceWeek : sourceWeeks) {
            WeekTemplate copyWeek = new WeekTemplate();
            copyWeek.setProgram(savedProgram);
            copyWeek.setName(sourceWeek.getName());
            WeekTemplate savedWeek = weekTemplateRepository.save(copyWeek);

            List<DayTemplate> sourceDays = dayTemplateRepository.findByWeekTemplateIdOrderBySortOrderAsc(sourceWeek.getId());
            for (DayTemplate sourceDay : sourceDays) {
                DayTemplate copyDay = new DayTemplate();
                copyDay.setWeekTemplate(savedWeek);
                copyDay.setName(sourceDay.getName());
                copyDay.setSortOrder(sourceDay.getSortOrder());
                DayTemplate savedDay = dayTemplateRepository.save(copyDay);

                List<DayExercise> sourceExercises = dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(sourceDay.getId());
                for (DayExercise sourceEx : sourceExercises) {
                    DayExercise copyEx = new DayExercise();
                    copyEx.setDayTemplate(savedDay);
                    copyEx.setExercise(sourceEx.getExercise());
                    copyEx.setSets(sourceEx.getSets());
                    copyEx.setReps(sourceEx.getReps());
                    copyEx.setRepsMax(sourceEx.getRepsMax());
                    copyEx.setSortOrder(sourceEx.getSortOrder());
                    copyEx.setAmrap(sourceEx.isAmrap());
                    dayExerciseRepository.save(copyEx);
                }
            }
        }

        return toResponse(savedProgram, null, 0, null);
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
            program.setCurrentWeek(program.getDurationWeeks());
        }

        TrainingProgram saved = programRepository.save(program);
        return findById(userId, saved.getId());
    }

    @Transactional
    public ProgramResponse rateProgram(UUID userId, UUID programId, int rating) {
        if (rating < 1 || rating > 10) {
            throw new IllegalArgumentException("Rating must be between 1 and 10.");
        }
        TrainingProgram program = findOwnedOrPublic(userId, programId);

        ProgramRating pr = new ProgramRating();
        pr.setProgramId(program.getId());
        pr.setUserId(userId);
        pr.setRating(rating);
        programRatingRepository.save(pr);

        return findById(userId, program.getId());
    }

    /** Package-private: validates program belongs to user and returns entity. */
    @Transactional(readOnly = true)
    public TrainingProgram findOwned(UUID userId, UUID programId) {
        return programRepository.findByIdAndUserId(programId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Program not found."));
    }

    @Transactional(readOnly = true)
    public TrainingProgram findOwnedOrPublic(UUID userId, UUID programId) {
        TrainingProgram program = programRepository.findById(programId)
                .orElseThrow(() -> new ResourceNotFoundException("Program not found."));
        if (!program.getUserId().equals(userId) && !program.getIsPublic()) {
            throw new ResourceNotFoundException("Program not found.");
        }
        return program;
    }

    private void validateAllExercisesArePublic(UUID programId) {
        List<WeekTemplate> weeks = weekTemplateRepository.findByProgramId(programId);
        for (WeekTemplate week : weeks) {
            List<DayTemplate> days = dayTemplateRepository.findByWeekTemplateIdOrderBySortOrderAsc(week.getId());
            for (DayTemplate day : days) {
                List<DayExercise> dayExercises = dayExerciseRepository.findByDayTemplateIdOrderBySortOrderAsc(day.getId());
                for (DayExercise de : dayExercises) {
                    if (de.getExercise() != null && !de.getExercise().getIsPublic()) {
                        throw new IllegalArgumentException(
                                "Cannot make program public: exercise '" + de.getExercise().getName() + "' is not public."
                        );
                    }
                }
            }
        }
    }

    private boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) return false;
        return authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private ProgramResponse toResponse(TrainingProgram p, Double avgRating, int count, Integer userRating) {
        return new ProgramResponse(
                p.getId(),
                p.getUserId(),
                p.getName(),
                p.getDescription(),
                p.getDurationWeeks(),
                p.getStartDate(),
                p.isActive(),
                p.getCurrentWeek(),
                p.getCreatedAt(),
                p.getGoal(),
                p.getIsPublic(),
                p.getSourceProgramId(),
                avgRating,
                count,
                userRating
        );
    }

    private record RatingStats(Double averageRating, int ratingsCount) {}
}
