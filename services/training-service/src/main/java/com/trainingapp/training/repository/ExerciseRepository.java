package com.trainingapp.training.repository;

import com.trainingapp.training.domain.Exercise;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Spring Data JPA repository for {@link Exercise} entities. */
public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {
    @EntityGraph(attributePaths = "targets")
    @Query("SELECT e FROM Exercise e WHERE (e.userId = :userId OR e.isPublic = true) AND e.isDeleted = false")
    List<Exercise> findByUserIdOrIsPublic(@Param("userId") UUID userId);
    
    @EntityGraph(attributePaths = "targets")
    @Query("SELECT e FROM Exercise e WHERE e.id = :id AND (e.userId = :userId OR e.isPublic = true)")
    Optional<Exercise> findByIdAndUserIdOrIsPublic(@Param("id") UUID id, @Param("userId") UUID userId);

    /** Returns up to 3 exercises whose name contains the query (case-insensitive). */
    @EntityGraph(attributePaths = "targets")
    @Query("SELECT e FROM Exercise e WHERE (e.userId = :userId OR e.isPublic = true) AND e.isDeleted = false AND LOWER(e.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Exercise> searchExercises(@Param("userId") UUID userId, @Param("name") String name, Pageable pageable);

    @EntityGraph(attributePaths = "targets")
    @Query("SELECT e FROM Exercise e WHERE e.isPublic = true AND e.isDeleted = false")
    List<Exercise> findByIsPublicTrueAndIsDeletedFalse();

    @EntityGraph(attributePaths = "targets")
    @Query("SELECT e FROM Exercise e WHERE e.userId = :userId AND e.isDeleted = false")
    List<Exercise> findByUserIdAndIsDeletedFalse(@Param("userId") UUID userId);

    /**
     * Checks whether an exercise with the given name and brand (both case-insensitive
     * and trimmed) already exists among the user's own exercises or public exercises
     * that are not soft-deleted. Optionally excludes a specific exercise ID (for updates).
     */
    @Query("""
        SELECT COUNT(e) > 0 FROM Exercise e
        WHERE (e.userId = :userId OR e.isPublic = true)
          AND e.isDeleted = false
          AND LOWER(TRIM(e.name)) = LOWER(TRIM(:name))
          AND (
            (:brand IS NULL AND e.equipmentBrand IS NULL)
            OR LOWER(TRIM(e.equipmentBrand)) = LOWER(TRIM(:brand))
          )
          AND (:excludeId IS NULL OR e.id <> :excludeId)
        """)
    boolean existsByNameInUserScope(
            @Param("userId") UUID userId,
            @Param("name") String name,
            @Param("brand") String brand,
            @Param("excludeId") UUID excludeId);
}
