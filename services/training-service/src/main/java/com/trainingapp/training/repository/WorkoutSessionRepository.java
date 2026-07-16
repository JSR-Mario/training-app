package com.trainingapp.training.repository;

import com.trainingapp.training.domain.WorkoutSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Spring Data JPA repository for {@link WorkoutSession} entities. */
public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {
    
    Optional<WorkoutSession> findByIdAndUserId(UUID id, UUID userId);
    
    List<WorkoutSession> findByUserIdAndCompletedAtIsNull(UUID userId);

    @Query("SELECT ws FROM WorkoutSession ws JOIN ws.dayTemplate dt JOIN dt.weekTemplate wt JOIN wt.program p WHERE ws.userId = :userId AND p.id = :programId AND ws.weekNumber = :weekNumber")
    List<WorkoutSession> findByUserIdAndProgramIdAndWeekNumber(@Param("userId") UUID userId, @Param("programId") UUID programId, @Param("weekNumber") int weekNumber);

    List<WorkoutSession> findByUserIdAndPerformedOnBetween(UUID userId, java.time.LocalDate startDate, java.time.LocalDate endDate);

    Optional<WorkoutSession> findFirstByUserIdAndDayTemplateIdAndNotesIsNotNullOrderByPerformedOnDesc(UUID userId, UUID dayTemplateId);
}
