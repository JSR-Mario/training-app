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
    List<SessionExerciseRating> findBySessionId(UUID sessionId);
}
