package com.trainingapp.analytics.repository;

import com.trainingapp.analytics.domain.ExerciseProgressEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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

    /**
     * Aggregates total volume per session for a given day template.
     *
     * <p>Groups all {@link ExerciseProgressEntry} rows that share the same
     * {@code dayTemplateId} and {@code sessionId}, summing their individual
     * {@code totalVolumeKg} values. This produces one row per completed session
     * for that workout day, regardless of which exercises are currently configured.
     *
     * <p>Result columns: {@code [sessionDate (LocalDate), sessionId (UUID),
     * weekNumber (Integer), totalVolumeKg (BigDecimal)]}.
     *
     * @param userId        the authenticated user's UUID (row-level security)
     * @param dayTemplateId the day template whose session history is requested
     * @return rows ordered by session date ascending
     */
    @Query("""
        SELECT e.sessionDate, e.sessionId, e.weekNumber, SUM(e.totalVolumeKg)
        FROM ExerciseProgressEntry e
        WHERE e.userId = :userId
          AND e.dayTemplateId = :dayTemplateId
          AND e.sessionId IS NOT NULL
        GROUP BY e.sessionDate, e.sessionId, e.weekNumber
        ORDER BY e.sessionDate ASC
        """)
    List<Object[]> findDayVolumeByUserIdAndDayTemplateId(
            @Param("userId") UUID userId,
            @Param("dayTemplateId") UUID dayTemplateId);
}
