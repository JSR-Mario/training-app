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

    @Query("SELECT ws FROM WorkoutSet ws JOIN ws.session s " +
           "WHERE s.userId = :userId AND s.completedAt IS NOT NULL AND s.performedOn BETWEEN :startDate AND :endDate")
    List<WorkoutSet> findByUserIdAndPerformedOnBetween(
        @Param("userId") UUID userId, 
        @Param("startDate") LocalDate startDate, 
        @Param("endDate") LocalDate endDate
    );

    @Query(value = """
        SELECT DISTINCT ON (e.id)
            e.id AS exerciseId,
            ws.weight_kg AS prWeight,
            (ws.reps_completed + COALESCE(ws.reps_completed_right, 0)) AS prReps
        FROM training.workout_sets ws
        JOIN training.day_exercises de ON ws.day_exercise_id = de.id
        JOIN training.exercises e ON de.exercise_id = e.id
        JOIN training.workout_sessions sess ON ws.session_id = sess.id
        WHERE sess.user_id = :userId
          AND sess.completed_at IS NOT NULL
          AND ws.weight_kg IS NOT NULL
        ORDER BY e.id, (ws.weight_kg * (ws.reps_completed + COALESCE(ws.reps_completed_right, 0))) DESC
        """, nativeQuery = true)
    List<com.trainingapp.training.dto.ExercisePrProjection> findPersonalRecordsByUserId(@Param("userId") UUID userId);

    /**
     * Returns the all-time total volume (kg) for a user across all completed sessions.
     *
     * <p>Used only once to bootstrap the {@code user_experience} row on first dashboard load.
     * Subsequent updates are done incrementally by {@link com.trainingapp.training.service.ExperienceService}.
     *
     * @param userId the user's UUID
     * @return total volume in kg, or {@code 0.0} if no data exists
     */
    @Query("""
            SELECT COALESCE(SUM(ws.weightKg * (ws.repsCompleted + COALESCE(ws.repsCompletedRight, 0))), 0)
            FROM WorkoutSet ws JOIN ws.session s
            WHERE s.userId = :userId
              AND s.completedAt IS NOT NULL
              AND ws.weightKg IS NOT NULL
              AND ws.repsCompleted IS NOT NULL
            """)
    Double findTotalVolumeByUserId(@Param("userId") UUID userId);
}

