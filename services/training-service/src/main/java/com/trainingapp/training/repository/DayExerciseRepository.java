package com.trainingapp.training.repository;

import com.trainingapp.training.domain.DayExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

/** Spring Data JPA repository for {@link DayExercise} entities. */
public interface DayExerciseRepository extends JpaRepository<DayExercise, UUID> {
    List<DayExercise> findByDayTemplateIdOrderBySortOrderAsc(UUID dayTemplateId);
}
