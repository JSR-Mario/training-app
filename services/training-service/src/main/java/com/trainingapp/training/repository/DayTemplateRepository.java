package com.trainingapp.training.repository;

import com.trainingapp.training.domain.DayTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

/** Spring Data JPA repository for {@link DayTemplate} entities. */
public interface DayTemplateRepository extends JpaRepository<DayTemplate, UUID> {
    List<DayTemplate> findByWeekTemplateIdOrderBySortOrderAsc(UUID weekTemplateId);
}
