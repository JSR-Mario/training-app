package com.trainingapp.training.repository;

import com.trainingapp.training.domain.WeekTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

/** Spring Data JPA repository for {@link WeekTemplate} entities. */
public interface WeekTemplateRepository extends JpaRepository<WeekTemplate, UUID> {
    List<WeekTemplate> findByProgramId(UUID programId);
}
