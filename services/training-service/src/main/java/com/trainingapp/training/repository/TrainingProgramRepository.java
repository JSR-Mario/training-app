package com.trainingapp.training.repository;

import com.trainingapp.training.domain.TrainingProgram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Spring Data JPA repository for {@link TrainingProgram} entities. */
public interface TrainingProgramRepository extends JpaRepository<TrainingProgram, UUID> {
    List<TrainingProgram> findByUserId(UUID userId);
    Optional<TrainingProgram> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("UPDATE TrainingProgram p SET p.isActive = false WHERE p.userId = :userId AND p.id != :excludeId")
    void deactivateAllOtherUserPrograms(@Param("userId") UUID userId, @Param("excludeId") UUID excludeId);
}
