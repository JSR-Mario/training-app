package com.trainingapp.training.repository;

import com.trainingapp.training.domain.ProgramRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link ProgramRating} entities.
 */
@Repository
public interface ProgramRatingRepository extends JpaRepository<ProgramRating, UUID> {

    List<ProgramRating> findByProgramIdAndUserId(UUID programId, UUID userId);

    Optional<ProgramRating> findFirstByProgramIdAndUserIdOrderByCreatedAtDesc(UUID programId, UUID userId);

    @Query("SELECT AVG(r.rating), COUNT(r.id) FROM ProgramRating r WHERE r.programId = :programId AND r.userId = :userId")
    List<Object[]> getUserProgramRatingStats(@Param("programId") UUID programId, @Param("userId") UUID userId);

    @Query("SELECT r.programId, AVG(r.rating), COUNT(r.id) FROM ProgramRating r WHERE r.userId = :userId AND r.programId IN :programIds GROUP BY r.programId")
    List<Object[]> getAverageRatingsForUserProgramsBatch(@Param("userId") UUID userId, @Param("programIds") List<UUID> programIds);

    @Query("SELECT AVG(r.rating), COUNT(r.id) FROM ProgramRating r, TrainingProgram p WHERE r.programId = p.id AND (p.id = :publicProgramId OR p.sourceProgramId = :publicProgramId)")
    List<Object[]> getPublicProgramRatingStats(@Param("publicProgramId") UUID publicProgramId);

    @Query("SELECT COALESCE(p.sourceProgramId, p.id), AVG(r.rating), COUNT(r.id) FROM ProgramRating r, TrainingProgram p WHERE r.programId = p.id AND (p.id IN :publicProgramIds OR p.sourceProgramId IN :publicProgramIds) GROUP BY COALESCE(p.sourceProgramId, p.id)")
    List<Object[]> getPublicProgramsRatingStatsBatch(@Param("publicProgramIds") List<UUID> publicProgramIds);
}
