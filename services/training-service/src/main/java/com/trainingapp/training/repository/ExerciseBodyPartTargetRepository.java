package com.trainingapp.training.repository;

import com.trainingapp.training.domain.ExerciseBodyPartTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

/** Spring Data JPA repository for {@link ExerciseBodyPartTarget} entities. */
public interface ExerciseBodyPartTargetRepository extends JpaRepository<ExerciseBodyPartTarget, UUID> {
    List<ExerciseBodyPartTarget> findByExerciseId(UUID exerciseId);
    List<ExerciseBodyPartTarget> findByExerciseIdIn(java.util.Collection<UUID> exerciseIds);
}
