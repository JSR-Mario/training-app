package com.trainingapp.analytics.repository;

import com.trainingapp.analytics.domain.ExerciseProgressEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link ExerciseProgressEntry} entities.
 *
 * <p>The primary lookup key is {@code (userId, exerciseId, sessionId)}, ensuring
 * each workout session gets its own isolated entry regardless of calendar date.
 * Legacy data may have a {@code null} sessionId and is retained via the old
 * {@code sessionDate}-based lookup for backward compatibility.
 */
@Repository
public interface ExerciseProgressRepository extends JpaRepository<ExerciseProgressEntry, UUID> {

    /**
     * Finds the progress entry for a specific exercise within a specific workout session.
     * This is the primary lookup used when processing a session-completed event.
     */
    Optional<ExerciseProgressEntry> findByUserIdAndExerciseIdAndSessionId(
            UUID userId, UUID exerciseId, UUID sessionId);

    /**
     * Deletes all progress entries associated with a given workout session.
     * Used when a session is uncompleted or deleted.
     */
    void deleteByUserIdAndSessionId(UUID userId, UUID sessionId);

    /**
     * Returns all progress entries for a given exercise, ordered chronologically.
     * Used by the analytics read endpoint to build progress charts.
     */
    List<ExerciseProgressEntry> findByUserIdAndExerciseIdOrderBySessionDateAsc(
            UUID userId, UUID exerciseId);
}
