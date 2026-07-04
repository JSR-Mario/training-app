package com.trainingapp.training.repository;

import com.trainingapp.training.domain.WorkoutSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Spring Data JPA repository for {@link WorkoutSet} entities. */
public interface WorkoutSetRepository extends JpaRepository<WorkoutSet, UUID> {
    
    @Query("SELECT ws FROM WorkoutSet ws JOIN ws.dayExercise de JOIN ws.session s " +
           "WHERE de.exercise.id = :exerciseId AND s.userId = :userId AND s.completedAt IS NOT NULL AND s.performedOn < :currentDate " +
           "ORDER BY s.performedOn DESC")
    List<WorkoutSet> findHistoricalSetsForExercise(
        @Param("exerciseId") UUID exerciseId, 
        @Param("userId") UUID userId, 
        @Param("currentDate") LocalDate currentDate
    );
    
    @Query("SELECT ws FROM WorkoutSet ws JOIN ws.dayExercise de JOIN ws.session s " +
           "WHERE de.exercise.id = :exerciseId AND s.userId = :userId AND s.completedAt IS NOT NULL " +
           "ORDER BY s.performedOn ASC")
    List<WorkoutSet> findHistoricalSetsForExerciseAll(
        @Param("exerciseId") UUID exerciseId, 
        @Param("userId") UUID userId
    );

    @Query("SELECT ws FROM WorkoutSet ws JOIN ws.session s WHERE ws.id = :id AND s.userId = :userId")
    Optional<WorkoutSet> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    List<WorkoutSet> findBySessionIdOrderByLoggedAtAsc(UUID sessionId);
}
