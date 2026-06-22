package com.trainingapp.training.repository;

import com.trainingapp.training.domain.Exercise;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Spring Data JPA repository for {@link Exercise} entities. */
public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {
    
    @EntityGraph(attributePaths = "targets")
    List<Exercise> findByUserId(UUID userId);
    
    @EntityGraph(attributePaths = "targets")
    Optional<Exercise> findByIdAndUserId(UUID id, UUID userId);

    /** Returns up to 3 exercises whose name contains the query (case-insensitive). */
    @EntityGraph(attributePaths = "targets")
    List<Exercise> findTop3ByUserIdAndNameContainingIgnoreCase(UUID userId, String name);
}
