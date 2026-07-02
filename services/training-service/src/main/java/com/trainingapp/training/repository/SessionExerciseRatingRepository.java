package com.trainingapp.training.repository;

import com.trainingapp.training.domain.SessionExerciseRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionExerciseRatingRepository extends JpaRepository<SessionExerciseRating, UUID> {
    Optional<SessionExerciseRating> findBySessionIdAndDayExerciseId(UUID sessionId, UUID dayExerciseId);
    void deleteBySessionIdAndDayExerciseId(UUID sessionId, UUID dayExerciseId);
    List<SessionExerciseRating> findBySessionId(UUID sessionId);
    @org.springframework.data.jpa.repository.Query("SELECT de.exercise.id, AVG(r.rating) FROM SessionExerciseRating r JOIN r.dayExercise de WHERE de.exercise.id IN :exerciseIds GROUP BY de.exercise.id")
    List<Object[]> getAverageRatingsForExercises(@org.springframework.data.repository.query.Param("exerciseIds") List<UUID> exerciseIds);
}
