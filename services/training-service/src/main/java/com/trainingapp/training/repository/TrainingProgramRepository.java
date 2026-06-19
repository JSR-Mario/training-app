package com.trainingapp.training.repository;

import com.trainingapp.training.domain.TrainingProgram;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Spring Data JPA repository for {@link TrainingProgram} entities. */
public interface TrainingProgramRepository extends JpaRepository<TrainingProgram, UUID> {
    List<TrainingProgram> findByUserId(UUID userId);
    Optional<TrainingProgram> findByIdAndUserId(UUID id, UUID userId);
}
