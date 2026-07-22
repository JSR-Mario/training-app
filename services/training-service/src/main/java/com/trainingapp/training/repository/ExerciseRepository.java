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
}
