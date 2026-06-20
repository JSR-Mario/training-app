package com.trainingapp.analytics.repository;

import com.trainingapp.analytics.domain.ExerciseProgressEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExerciseProgressRepository extends JpaRepository<ExerciseProgressEntry, UUID> {
    Optional<ExerciseProgressEntry> findByUserIdAndExerciseIdAndSessionDate(
            UUID userId, UUID exerciseId, LocalDate sessionDate);

    List<ExerciseProgressEntry> findByUserIdAndExerciseIdOrderBySessionDateAsc(
            UUID userId, UUID exerciseId);
}
