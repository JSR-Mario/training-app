package com.trainingapp.training.repository;

import com.trainingapp.training.domain.SessionExerciseRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionExerciseRatingRepository extends JpaRepository<SessionExerciseRating, UUID> {
    Optional<SessionExerciseRating> findBySessionIdAndSessionExerciseId(UUID sessionId, UUID sessionExerciseId);
    void deleteBySessionIdAndSessionExerciseId(UUID sessionId, UUID sessionExerciseId);
    List<SessionExerciseRating> findBySessionId(UUID sessionId);
    @org.springframework.data.jpa.repository.Query("SELECT se.exercise.id, AVG(r.rating) FROM SessionExerciseRating r JOIN r.sessionExercise se WHERE se.exercise.id IN :exerciseIds GROUP BY se.exercise.id")
    List<Object[]> getAverageRatingsForExercises(@org.springframework.data.repository.query.Param("exerciseIds") List<UUID> exerciseIds);
}
